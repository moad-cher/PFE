"""
Notification helpers — create a DB row and push it live via WebSocket.
Call these from routers/tasks.py, routers/hiring.py, etc.
"""

from __future__ import annotations

from app.core.database import AsyncSessionLocal
from app.notifications.models import Notification, NotifTypeEnum
from app.websockets.manager import ws_manager


async def _create_and_push(
    recipient_id: int,
    notif_type: NotifTypeEnum,
    title: str,
    message: str,
    link: str = "",
):
    async with AsyncSessionLocal() as db:
        notif = Notification(
            recipient_id=recipient_id,
            type=notif_type,
            title=title,
            message=message,
            link=link,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)

    payload = {
        "type": "notification",
        "id": notif.id,
        "notif_type": notif.type.value,
        "title": notif.title,
        "message": notif.message,
        "link": notif.link,
        "is_read": False,
        "created_at": notif.created_at.isoformat(),
    }
    await ws_manager.send_personal(recipient_id, payload)


# ------------------------------------------------------------------ #
#  Convenience wrappers                                                #
# ------------------------------------------------------------------ #

async def notify_task_assigned(user_id: int, task_title: str, project_name: str, task_id: int):
    await _create_and_push(
        recipient_id=user_id,
        notif_type=NotifTypeEnum.task_assigned,
        title="Task assigned",
        message=f'You have been assigned to "{task_title}" in {project_name}.',
        link=f"/tasks/{task_id}",
    )


async def notify_task_completed(manager_id: int, task_title: str, task_id: int):
    await _create_and_push(
        recipient_id=manager_id,
        notif_type=NotifTypeEnum.task_updated,
        title="Task completed",
        message=f'Task "{task_title}" has been marked as complete.',
        link=f"/tasks/{task_id}",
    )


async def notify_application_received(hr_id: int, job_title: str, app_id: int):
    await _create_and_push(
        recipient_id=hr_id,
        notif_type=NotifTypeEnum.application,
        title="New application",
        message=f'A new application was submitted for "{job_title}".',
        link=f"/hiring/applications/{app_id}",
    )


async def notify_application_status(applicant_user_id: int, job_title: str, new_status: str):
    await _create_and_push(
        recipient_id=applicant_user_id,
        notif_type=NotifTypeEnum.application,
        title="Application update",
        message=f'Your application for "{job_title}" status changed to: {new_status}.',
        link="/hiring/my-applications",
    )


async def notify_reward(user_id: int, points: int, task_title: str):
    await _create_and_push(
        recipient_id=user_id,
        notif_type=NotifTypeEnum.reward,
        title="Points earned",
        message=f'You earned {points} point(s) for completing "{task_title}".',
        link="/profile",
    )


async def notify_task_updated(user_id: int, task_title: str, detail: str, task_id: int):
    await _create_and_push(
        recipient_id=user_id,
        notif_type=NotifTypeEnum.task_updated,
        title="Task updated",
        message=f'"{task_title}": {detail}',
        link=f"/tasks/{task_id}",
    )


async def notify_deadline_approaching(user_id: int, task_title: str, deadline: str, task_id: int):
    await _create_and_push(
        recipient_id=user_id,
        notif_type=NotifTypeEnum.deadline,
        title="Deadline approaching",
        message=f'Task "{task_title}" is due on {deadline}.',
        link=f"/tasks/{task_id}",
    )


async def notify_ai_complete(hr_id: int, applicant_name: str, app_id: int, job_id: int):
    """Special real-time event that doesn't necessarily create a persistent DB notification."""
    payload = {
        "type": "ai_complete",
        "app_id": app_id,
        "job_id": job_id,
        "applicant_name": applicant_name,
    }
    await ws_manager.send_personal(hr_id, payload)
