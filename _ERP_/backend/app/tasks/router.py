from datetime import datetime, timezone
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, require_roles
from app.notifications.service import (
    notify_task_assigned,
    notify_task_completed,
    notify_task_updated,
    notify_reward,
    schedule_notification,
)
from app.users.models import User
from app.projects.models import Project, ProjectConfig, RewardLog, Task, Comment, TaskStatus
from app.projects.schemas import (
    CommentCreate,
    CommentRead,
    TaskCreate,
    TaskMoveRequest,
    TaskRead,
    TaskUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])

_TASK_MANAGERS = ("admin", "project_manager")
_TASK_PARTICIPANTS = ("admin", "project_manager", "team_member")


async def _get_project_or_403(project_id: int, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.members))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    allowed = (
        user.role == "admin"
        or project.manager_id == user.id
        or any(m.id == user.id for m in project.members)
    )
    if not allowed:
        raise HTTPException(403, "Access denied")
    return project


async def _award_points(task: Task, db: AsyncSession):
    """Award points to every assignee upon task completion."""
    logger.info(f"[AWARD_POINTS] Starting for task {task.id}, assigned_to count: {len(task.assigned_to)}")
    
    cfg_res = await db.execute(
        select(ProjectConfig).where(ProjectConfig.project_id == task.project_id)
    )
    cfg = cfg_res.scalar_one_or_none()
    on_time_pts = cfg.points_on_time if cfg else 10
    late_pts = cfg.points_late if cfg else 3

    is_late = bool(task.end_time and task.end_time < datetime.now(timezone.utc))
    points = late_pts if is_late else on_time_pts
    reason = "Completed late" if is_late else "Completed on time"
    
    logger.info(f"[AWARD_POINTS] Points to award: {points}, is_late: {is_late}")

    for assignee in task.assigned_to:
        logger.info(f"[AWARD_POINTS] Awarding {points} points to user {assignee.id} ({assignee.username})")
        assignee.reward_points = (assignee.reward_points or 0) + points
        db.add(assignee)  # Explicitly mark assignee for update
        db.add(RewardLog(user_id=assignee.id, task_id=task.id, points=points))
        schedule_notification(
            notify_reward(assignee.id, points, task.title),
            label="notify_reward",
            context={"task_id": task.id, "user_id": assignee.id, "points": points},
        )
    
    logger.info(f"[AWARD_POINTS] Completed, awarded to {len(task.assigned_to)} assignees")


# ── Task CRUD ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
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
    current_user: User = Depends(require_roles(*_TASK_MANAGERS)),
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
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
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
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
):
    project = await _get_project_or_403(project_id, current_user, db)
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

    if "status" in payload and payload["status"] != old_status:
        is_manager = current_user.role == "admin" or project.manager_id == current_user.id
        is_assignee = any(u.id == current_user.id for u in task.assigned_to)
        if not (is_manager or is_assignee):
            raise HTTPException(403, "Only assignees or project managers can change task status")

    for field, value in payload.items():
        setattr(task, field, value)

    if task.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)
        background_tasks.add_task(notify_task_completed, project.manager_id, task.title, task.id)

    if assignee_ids is not None:
        users = (await db.execute(select(User).where(User.id.in_(assignee_ids)))).scalars().all()
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
    current_user: User = Depends(require_roles(*_TASK_MANAGERS)),
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
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
):
    """Move a task to a different Kanban column (status slug)."""
    project = await _get_project_or_403(project_id, current_user, db)

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

    is_manager = current_user.role == "admin" or project.manager_id == current_user.id
    is_assignee = any(u.id == current_user.id for u in task.assigned_to)
    if not (is_manager or is_assignee):
        raise HTTPException(403, "Only assignees or project managers can change task status")

    task.status = data.status
    if data.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)
        background_tasks.add_task(notify_task_completed, project.manager_id, task.title, task.id)

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
    current_user: User = Depends(require_roles(*_TASK_MANAGERS)),
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
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
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
    current_user: User = Depends(require_roles(*_TASK_PARTICIPANTS)),
):
    await _get_project_or_403(project_id, current_user, db)
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
