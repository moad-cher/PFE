"""
Deadline notification scheduler.

Runs hourly as a background asyncio task started at application startup.
For each incomplete task whose deadline falls within the project's
`notify_deadline_days` window, notifies all assignees.
"""
import asyncio
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.notifications.service import notify_deadline_approaching
from app.projects.models import ProjectConfig, Task

logger = logging.getLogger(__name__)

_CHECK_INTERVAL_SECONDS = 3600  # 1 hour


async def _run_deadline_check() -> None:
    today = date.today()
    async with AsyncSessionLocal() as db:
        tasks_res = await db.execute(
            select(Task)
            .where(Task.deadline.isnot(None), Task.completed_at.is_(None))
            .options(selectinload(Task.assigned_to))
        )
        tasks = tasks_res.scalars().all()

        # Cache project configs to avoid N queries
        configs: dict[int, int] = {}

        for task in tasks:
            # Resolve notify_deadline_days from project config
            if task.project_id not in configs:
                cfg_res = await db.execute(
                    select(ProjectConfig).where(ProjectConfig.project_id == task.project_id)
                )
                cfg = cfg_res.scalar_one_or_none()
                configs[task.project_id] = cfg.notify_deadline_days if cfg else 2

            notify_days = configs[task.project_id]
            delta = (task.deadline - today).days

            if 0 <= delta <= notify_days:
                for assignee in task.assigned_to:
                    await notify_deadline_approaching(
                        assignee.id,
                        task.title,
                        task.deadline.isoformat(),
                        task.id,
                    )


async def deadline_scheduler() -> None:
    """Loop: wait one interval (accounting for task execution time), then run the deadline check."""
    while True:
        start_time = asyncio.get_event_loop().time()
        try:
            await _run_deadline_check()
        except Exception:
            logger.exception("Deadline scheduler error")
        
        # Calculate next run time
        elapsed = asyncio.get_event_loop().time() - start_time
        sleep_for = max(0, _CHECK_INTERVAL_SECONDS - elapsed)
        await asyncio.sleep(sleep_for)
