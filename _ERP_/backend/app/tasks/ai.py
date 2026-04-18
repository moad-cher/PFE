"""
AI-powered task assignment suggestion using local Ollama LLM.
Mirrors projects/ai_suggest.py from the Django source.
"""

from __future__ import annotations

import json

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.ai.service import ollama_chat


async def suggest_task_assignees(
    task_title: str,
    task_description: str,
    members: list[dict],
) -> dict:
    """
    Given a task and a list of project members (with skills, active_tasks,
    reward_points), ask the LLM to rank the best assignees.

    Each member dict must contain:
        user_id, username, full_name, skills, active_tasks, reward_points

    Returns:
        {
            "members": [
                {
                    "user_id": int,
                    "username": str,
                    "full_name": str,
                    "skills": str,
                    "active_tasks": int,
                    "confidence": float,    # 0–1
                    "reason": str,
                }
            ],
            "error": None | str,
        }
    """
    if not members:
        return {"members": [], "error": "No members available"}

    system_prompt = (
        "You are an ERP project management assistant. "
        "Analyse the task and available team members to propose the best assignment. "
        "Consider skills, current workload (active_tasks), and reward_points. "
        "Reply ONLY with valid JSON — key \"ranked_members\": array of up to 3 objects, "
        "each with: username (the @username without @ symbol, exactly as shown), reason (string), confidence (float 0.0–1.0). "
        "IMPORTANT: Use the exact @username value (without the @) from the member list, not their full name."
    )

    member_lines = "\n".join(
        f"- Username: {m['username']}, Name: {m['full_name']}, Skills: {m['skills'] or 'N/A'}, "
        f"Active Tasks: {m['active_tasks']}, Reward Points: {m['reward_points']}"
        for m in members
    )

    prompt = (
        f"Task: {task_title}\n"
        f"Description: {task_description or 'No description provided.'}\n\n"
        f"Available team members:\n{member_lines}"
    )

    try:
        raw = await ollama_chat(
            [{"role": "user", "content": prompt}],
            system_prompt=system_prompt,
            json_mode=True,
        )
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end]) if start >= 0 and end > start else {}
        ranked = data.get("ranked_members", [])
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"Task assignment suggestion failed: {exc}")
        return {"members": [], "error": str(exc)}

    member_by_username = {m["username"]: m for m in members}
    result = []
    for item in ranked:
        uname = item.get("username", "")
        member = member_by_username.get(uname)
        if not member:
            continue
        result.append({
            "user_id": member["user_id"],
            "username": uname,
            "full_name": member["full_name"],
            "skills": member["skills"] or "",
            "active_tasks": member["active_tasks"],
            "confidence": float(item.get("confidence", 0.0)),
            "reason": item.get("reason", ""),
        })

    # Sort by confidence (highest first)
    result.sort(key=lambda x: x["confidence"], reverse=True)

    return {"members": result, "error": None}


async def run_ai_task_suggestion(task_id: int, project_id: int, user_id: int) -> None:
    """
    Background task that computes assignee suggestions, persists them on the task,
    then emits a personal realtime event to the requester.
    """
    from app.core.database import AsyncSessionLocal
    from app.projects.models import Project, Task, task_assignees
    from app.websockets.manager import ws_manager

    async with AsyncSessionLocal() as db:
        # Load project and task
        project_res = await db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.manager), selectinload(Project.members))
        )
        project = project_res.scalar_one_or_none()
        if not project:
            return

        task_res = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
        task = task_res.scalar_one_or_none()
        if not task:
            return

        # Build workload stats for project members
        all_members = list({project.manager, *project.members})
        member_ids = [m.id for m in all_members]
        active_counts: dict[int, int] = {m.id: 0 for m in all_members}

        if member_ids:
            counts_res = await db.execute(
                select(task_assignees.c.user_id, func.count(Task.id).label("count"))
                .join(Task, task_assignees.c.task_id == Task.id)
                .where(
                    task_assignees.c.user_id.in_(member_ids),
                    Task.project_id == project_id,
                    Task.status != "done",
                )
                .group_by(task_assignees.c.user_id)
            )
            for row in counts_res.all():
                active_counts[row.user_id] = row.count

        member_dicts = [
            {
                "user_id": m.id,
                "username": m.username,
                "full_name": f"{m.first_name} {m.last_name}".strip(),
                "skills": getattr(m, "skills", "") or "",
                "active_tasks": active_counts.get(m.id, 0),
                "reward_points": m.reward_points,
            }
            for m in all_members
        ]

        suggestions = await suggest_task_assignees(task.title, task.description, member_dicts)

        task.ai_suggestions = json.dumps(suggestions)
        await db.commit()

        await ws_manager.send_personal(
            user_id,
            {
                "type": "task_suggestion_complete",
                "task_id": task_id,
                "project_id": project_id,
            },
        )
