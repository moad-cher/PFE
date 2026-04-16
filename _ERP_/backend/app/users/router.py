import os
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import hash_password, verify_password
from app.core.media import ensure_media_dir, get_media_url, AVATARS_DIR
from app.users.models import Department, User
from app.projects.models import Project, Task, project_members, task_assignees
from app.users.schemas import (
    DepartmentCreate, DepartmentRead,
    PasswordChange, UserAdminUpdate, UserRead, UserUpdate, UserBrief, UserStats,
)

router = APIRouter(prefix="/users", tags=["users"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])


# ── User list / detail ──────────────────────────────────────────────────────

@router.get("/", response_model=list[UserBrief])
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.username))
    return result.scalars().all()


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Count active projects where user is manager or member
    proj_q = await db.execute(
        select(func.count(Project.id.distinct())).where(
            or_(
                Project.manager_id == current_user.id,
                Project.id.in_(select(project_members.c.project_id).where(project_members.c.user_id == current_user.id)),
            )
        )
    )
    active_projects = proj_q.scalar_one()

    # Tasks done
    tasks_done_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.id.in_(select(task_assignees.c.task_id).where(task_assignees.c.user_id == current_user.id)),
            Task.status == "done",
        )
    )
    tasks_done = tasks_done_q.scalar_one()

    # Tasks active (not done)
    tasks_active_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.id.in_(select(task_assignees.c.task_id).where(task_assignees.c.user_id == current_user.id)),
            Task.status != "done",
        )
    )
    tasks_active = tasks_active_q.scalar_one()

    return UserStats(active_projects=active_projects, tasks_done=tasks_done, tasks_active=tasks_active)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ── Profile update ─────────────────────────────────────────────────────────

@router.patch("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    avatar_dir = ensure_media_dir(AVATARS_DIR)
    ext = (file.filename or "jpg").rsplit(".", 1)[-1]
    file_path = avatar_dir / f"{current_user.id}.{ext}"
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(await file.read())
    
    current_user.avatar = get_media_url(AVATARS_DIR, f"{current_user.id}.{ext}")
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/password", status_code=204)
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()


# ── Admin: manage all users ───────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[UserRead])
async def admin_list_all_users_legacy(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    """Admin/HR: list all users including inactive."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .order_by(User.username)
    )
    return result.scalars().all()


@router.patch("/admin/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Admin-only: update role, is_active, department."""
    if user_id == current_user.id:
        raise HTTPException(400, "Admins cannot modify their own role or status via this endpoint")
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.department))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user, ["department"])
    return user


# ── Departments ──────────────────────────────────────────────────────────────

dept_router = APIRouter(prefix="/departments", tags=["departments"])


@dept_router.get("/", response_model=list[DepartmentRead])
async def list_departments(db: AsyncSession = Depends(get_db)):
    """Public endpoint - no auth required for registration page"""
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@dept_router.post("/", response_model=DepartmentRead, status_code=201)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    dept = Department(name=data.name, description=data.description)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@dept_router.patch("/{dept_id}", response_model=DepartmentRead)
async def update_department(
    dept_id: int,
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(404, "Department not found")
    dept.name = data.name
    dept.description = data.description
    await db.commit()
    await db.refresh(dept)
    return dept


@dept_router.delete("/{dept_id}", status_code=204)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(404, "Department not found")
    await db.delete(dept)
    await db.commit()


# ── Admin Router ──────────────────────────────────────────────────────────────

@admin_router.get("/users", response_model=list[UserRead])
async def admin_list_all_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    """Admin/HR: list all users including inactive."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .order_by(User.username)
    )
    return result.scalars().all()


@admin_router.get("/stats")
async def admin_get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr_manager")),
):
    """Admin/HR: get system statistics."""
    from sqlalchemy import case

    # Total users
    total_result = await db.execute(select(func.count(User.id)))
    total_users = total_result.scalar_one()

    # Active users
    active_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_count = active_result.scalar_one()

    # Inactive users
    inactive_count = total_users - active_count

    # Users per role
    role_result = await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    )
    users_per_role = {role or "unknown": count for role, count in role_result.all()}

    # Departments count
    dept_result = await db.execute(select(func.count(Department.id)))
    departments_count = dept_result.scalar_one()

    # Users per department (for chart)
    dept_users_result = await db.execute(
        select(Department.name, func.count(User.id))
        .outerjoin(User, Department.id == User.department_id)
        .group_by(Department.name)
        .order_by(func.count(User.id).desc())
    )
    users_per_department = [{"name": name or "No Department", "value": count} for name, count in dept_users_result.all()]

    # New users this week
    from datetime import datetime, timedelta
    week_ago = datetime.now() - timedelta(days=7)
    new_users_week = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_users_week = new_users_week.scalar_one() or 0

    # Task completion stats (across all projects)
    from app.projects.models import Task
    task_stats_result = await db.execute(
        select(
            func.count(Task.id),
            func.sum(case((Task.status == "done", 1), else_=0)),
            func.sum(case((Task.status != "done", 1), else_=0)),
        )
    )
    task_row = task_stats_result.first()
    total_tasks = task_row[0] if task_row else 0
    completed_tasks = task_row[1] if task_row and task_row[1] else 0
    active_tasks = total_tasks - (completed_tasks or 0)

    # Projects count
    from app.projects.models import Project
    projects_result = await db.execute(select(func.count(Project.id)))
    total_projects = projects_result.scalar_one() or 0

    return {
        "total_users": total_users,
        "active_count": active_count,
        "inactive_count": inactive_count,
        "departments_count": departments_count,
        "users_per_role": users_per_role,
        "users_per_department": users_per_department,
        "new_users_this_week": new_users_week,
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "active_tasks": active_tasks,
    }


@admin_router.patch("/users/{user_id}/role", response_model=UserRead)
async def admin_change_role(
    user_id: int,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Admin-only: change user role. HR cannot change roles."""
    if user_id == current_user.id:
        raise HTTPException(400, "Admins cannot modify their own role")

    if not data.role:
        raise HTTPException(400, "Role is required")

    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.department))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.role = data.role
    await db.commit()
    await db.refresh(user, ["department"])
    return user


@admin_router.patch("/users/{user_id}/department", response_model=UserRead)
async def admin_assign_department(
    user_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin", "hr_manager")),
):
    """Admin/HR: assign user to department."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.department))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    
    user.department_id = data.get("department_id")
    await db.commit()
    await db.refresh(user, ["department"])
    return user


@admin_router.delete("/users/{user_id}", status_code=204)
async def admin_hard_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Admin-only: hard delete user. HR cannot hard delete."""
    if user_id == current_user.id:
        raise HTTPException(400, "Admins cannot delete themselves")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    await db.delete(user)
    await db.commit()


@admin_router.patch("/users/{user_id}/status", response_model=UserRead)
async def hr_toggle_user_status(
    user_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr_manager")),
):
    """Admin/HR: activate/deactivate user (soft delete)."""
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot modify own status")

    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.department))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.is_active = data.get("is_active", False)
    await db.commit()
    await db.refresh(user, ["department"])
    return user
