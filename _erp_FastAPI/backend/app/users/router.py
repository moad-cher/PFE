import os
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import hash_password, verify_password
from app.users.models import Department, User
from app.projects.models import Project, Task, project_members, task_assignees
from app.users.schemas import (
    DepartmentCreate, DepartmentRead,
    PasswordChange, UserAdminUpdate, UserRead, UserUpdate, UserBrief, UserStats,
)

router = APIRouter(prefix="/users", tags=["users"])


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
    os.makedirs(f"{settings.MEDIA_DIR}/avatars", exist_ok=True)
    ext = (file.filename or "jpg").rsplit(".", 1)[-1]
    path = f"{settings.MEDIA_DIR}/avatars/{current_user.id}.{ext}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    current_user.avatar = path
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
async def admin_list_all_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    """Admin-only: list all users including inactive."""
    result = await db.execute(select(User).order_by(User.username))
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
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


# ── Departments ──────────────────────────────────────────────────────────────

dept_router = APIRouter(prefix="/departments", tags=["departments"])


@dept_router.get("/", response_model=list[DepartmentRead])
async def list_departments(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@dept_router.post("/", response_model=DepartmentRead, status_code=201)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("admin")),
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
    _=Depends(require_roles("admin")),
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
    _=Depends(require_roles("admin")),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(404, "Department not found")
    await db.delete(dept)
    await db.commit()
