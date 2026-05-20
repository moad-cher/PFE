from datetime import datetime, timezone, timedelta
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user
from app.auth.permissions import (
    can_access_project,
    can_manage_project,
    can_create_task,
    can_edit_task_status,
    can_reassign_task,
    can_delete_task,
)
from app.notifications.service import (
    notify_task_assigned,
    notify_task_completed,
    notify_task_blocked,
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


async def _get_project_or_403(project_id: int, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.members))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    
    if not can_access_project(user, project):
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

async def _revoke_points(task: Task, db: AsyncSession):
    """Revoke points if task is removed from done."""
    logger.info(f"[REVOKE_POINTS] Starting for task {task.id}")

    # Delete RewardLogs and deduct points
    logs_res = await db.execute(select(RewardLog).where(RewardLog.task_id == task.id))
    logs = logs_res.scalars().all()
    
    for log in logs:
        # Subtract from user points
        user = await db.get(User, log.user_id)
        if user and user.reward_points is not None:
            user.reward_points = max(0, user.reward_points - log.points)
            db.add(user)
            
        # Delete the corresponding reward notification for this user
        from app.notifications.models import Notification, NotifTypeEnum
        exact_message = f'You earned {log.points} point(s) for completing "{task.title}".'
        notifs_res = await db.execute(
            select(Notification)
            .where(Notification.recipient_id == log.user_id)
            .where(Notification.type == NotifTypeEnum.reward)
            .where(Notification.message == exact_message)
        )
        # We need to dispatch a websocket event immediately to auto-remove from UI
        from app.websockets.manager import ws_manager
        
        for notif in notifs_res.scalars().all():
            notif_id = notif.id
            await db.delete(notif)
            try:
                await ws_manager.send_personal(log.user_id, {
                    "type": "notification_deleted",
                    "id": notif_id
                })
            except Exception as e:
                logger.error(f"Failed pushing WS block on reward revoke: {e}")
                
        try:
            await ws_manager.send_personal(log.user_id, {
                "type": "points_revoked",
                "task_id": task.id
            })
        except Exception as e:
            pass
            
        # remove the log entry
        await db.delete(log)
    
    logger.info(f"[REVOKE_POINTS] Completed. Revoked logs: {len(logs)}")


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
    if not can_create_task(current_user, project):
        raise HTTPException(403, "Only managers can create tasks")

    # 30-minute grace period for discrete shift selection
    if data.start_time and data.start_time < (datetime.now(timezone.utc) - timedelta(minutes=30)):
        raise HTTPException(400, "Task start date must be in the future")

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
        background_tasks.add_task(notify_task_assigned, uid, task.title, project.name, task.project_id)

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
        if not can_edit_task_status(current_user, task, project):
            raise HTTPException(403, "Only assignees or project managers can change task status")

    for field, value in payload.items():
        setattr(task, field, value)

    if payload.get("is_blocked") is True:
        background_tasks.add_task(
            notify_task_blocked,
            project.manager_id,
            task.title,
            task.blocker_reason or "No reason provided",
            task.project_id
        )

    if task.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)
        background_tasks.add_task(notify_task_completed, project.manager_id, task.title, task.project_id)

    if assignee_ids is not None:
        if not can_manage_project(current_user, project):
            raise HTTPException(403, "Only project managers can reassign tasks")
        users = (await db.execute(select(User).where(User.id.in_(assignee_ids)))).scalars().all()
        task.assigned_to = list(users)

    await db.commit()
    await db.refresh(task, ["assigned_to"])

    detail = f"Status changed → {task.status}" if task.status != old_status else "Task updated"
    for assignee in task.assigned_to:
        background_tasks.add_task(notify_task_updated, assignee.id, task.title, detail, task.project_id)

    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    project_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_403(project_id, current_user, db)
    if not can_delete_task(current_user, project):
        raise HTTPException(403, "Only managers can delete tasks")
        
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

    if not can_edit_task_status(current_user, task, project):
        raise HTTPException(403, "Only assignees or project managers can change task status")

    previous_status = task.status
    task.status = data.status

    if data.status == "done" and previous_status != "done":
        task.completed_at = datetime.now(timezone.utc)
        await _award_points(task, db)
        background_tasks.add_task(notify_task_completed, project.manager_id, task.title, task.project_id)
    elif previous_status == "done" and data.status != "done":
        task.completed_at = None
        await _revoke_points(task, db)

    await db.commit()
    await db.refresh(task, ["assigned_to"])

    detail = f"Status changed → {data.status}"
    for assignee in task.assigned_to:
        background_tasks.add_task(notify_task_updated, assignee.id, task.title, detail, task.project_id)

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
    if not can_reassign_task(current_user, project):
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

    background_tasks.add_task(notify_task_assigned, new_user.id, task.title, project.name, task.project_id)
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
                task.project_id
            )

    return comment
