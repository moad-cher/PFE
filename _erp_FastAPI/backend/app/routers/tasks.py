from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user
from app.helpers.notifications import notify_task_assigned, notify_task_updated, notify_reward
from app.models.accounts import User
from app.models.projects import Project, ProjectConfig, RewardLog, Task, Comment, TaskStatus
from app.schemas.project import (
    CommentCreate,
    CommentRead,
    TaskCreate,
    TaskMoveRequest,
    TaskRead,
    TaskUpdate,
)

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


async def _get_project_or_403(project_id: int, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.members))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    allowed = (
        user.role in ("admin",)
        or project.manager_id == user.id
        or any(m.id == user.id for m in project.members)
    )
    if not allowed:
        raise HTTPException(403, "Access denied")
    return project


async def _award_points(task: Task, db: AsyncSession):
    """Award points to every assignee upon task completion."""
    cfg_res = await db.execute(
        select(ProjectConfig).where(ProjectConfig.project_id == task.project_id)
    )
    cfg = cfg_res.scalar_one_or_none()
    on_time_pts = cfg.points_on_time if cfg else 10
    late_pts = cfg.points_late if cfg else 3

    is_late = bool(task.deadline and task.deadline < date.today())
    points = late_pts if is_late else on_time_pts

    for assignee in task.assigned_to:
        assignee.reward_points = (assignee.reward_points or 0) + points
        db.add(RewardLog(user_id=assignee.id, task_id=task.id, points=points))
        # fire-and-forget notification (no background task available here, use direct call)
        import asyncio
        asyncio.ensure_future(notify_reward(assignee.id, points, task.title))


# ── Task CRUD ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    result = await db.execute(
        select(Task).where(Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
        .order_by(Task.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=TaskRead, status_code=201)
async def create_task(
    project_id: int,
    data: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_403(project_id, current_user, db)
    assignee_ids = data.assigned_to_ids
    task_data = data.model_dump(exclude={"assigned_to_ids"})
    task = Task(**task_data, project_id=project_id)
    if assignee_ids:
        users = (await db.execute(select(User).where(User.id.in_(assignee_ids)))).scalars().all()
        task.assigned_to = list(users)
    db.add(task)
    await db.commit()
    await db.refresh(task, ["assigned_to"])

    for uid in assignee_ids:
        background_tasks.add_task(notify_task_assigned, uid, task.title, project.name, task.id)

    return task


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    project_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    project_id: int,
    task_id: int,
    data: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    payload = data.model_dump(exclude_none=True)
    assignee_ids = payload.pop("assigned_to_ids", None)
    old_status = task.status

    for field, value in payload.items():
        setattr(task, field, value)

    if task.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)

    new_assigned_ids: list[int] = []
    if assignee_ids is not None:
        users = (await db.execute(select(User).where(User.id.in_(assignee_ids)))).scalars().all()
        new_assignees = set(u.id for u in users)
        old_assignees = set(a.id for a in task.assigned_to)
        new_assigned_ids = list(new_assignees - old_assignees)
        task.assigned_to = list(users)

    await db.commit()
    await db.refresh(task, ["assigned_to"])

    detail = f"Status changed → {task.status}" if task.status != old_status else "Task updated"
    for assignee in task.assigned_to:
        background_tasks.add_task(notify_task_updated, assignee.id, task.title, detail, task.id)

    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    project_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    result = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await db.delete(task)
    await db.commit()


# ── Move (Kanban drag) ────────────────────────────────────────────────────────

@router.patch("/{task_id}/move", response_model=TaskRead)
async def move_task(
    project_id: int,
    task_id: int,
    data: TaskMoveRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a task to a different Kanban column (status slug)."""
    await _get_project_or_403(project_id, current_user, db)

    # Validate that the target status exists in the project
    status_res = await db.execute(
        select(TaskStatus).where(
            TaskStatus.project_id == project_id,
            TaskStatus.slug == data.status,
        )
    )
    if not status_res.scalar_one_or_none():
        raise HTTPException(400, f"Status '{data.status}' does not exist in this project")

    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    old_status = task.status
    task.status = data.status

    if data.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)

    await db.commit()
    await db.refresh(task, ["assigned_to"])

    detail = f"Status changed → {data.status}"
    for assignee in task.assigned_to:
        background_tasks.add_task(notify_task_updated, assignee.id, task.title, detail, task.id)

    return task


# ── Reassign ──────────────────────────────────────────────────────────────────

@router.patch("/{task_id}/reassign", response_model=TaskRead)
async def reassign_task(
    project_id: int,
    task_id: int,
    new_assignee_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace all assignees with a single new assignee (manager only)."""
    project = await _get_project_or_403(project_id, current_user, db)
    if project.manager_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only the project manager can reassign tasks")

    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    user_res = await db.execute(select(User).where(User.id == new_assignee_id))
    new_user = user_res.scalar_one_or_none()
    if not new_user:
        raise HTTPException(404, "User not found")

    task.assigned_to = [new_user]
    await db.commit()
    await db.refresh(task, ["assigned_to"])

    background_tasks.add_task(notify_task_assigned, new_user.id, task.title, project.name, task.id)
    return task


# ── Comments ─────────────────────────────────────────────────────────────────

@router.get("/{task_id}/comments", response_model=list[CommentRead])
async def list_comments(
    project_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    result = await db.execute(
        select(Comment).where(Comment.task_id == task_id)
        .options(selectinload(Comment.author))
        .order_by(Comment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{task_id}/comments", response_model=CommentRead, status_code=201)
async def add_comment(
    project_id: int,
    task_id: int,
    data: CommentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_403(project_id, current_user, db)
    # load task to notify assignees
    task_res = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
        .options(selectinload(Task.assigned_to))
    )
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    comment = Comment(task_id=task_id, author_id=current_user.id, content=data.content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment, ["author"])

    for assignee in task.assigned_to:
        if assignee.id != current_user.id:
            background_tasks.add_task(
                notify_task_updated,
                assignee.id,
                task.title,
                f"New comment by {current_user.username}",
                task.id,
            )

    return comment
