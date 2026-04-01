"""
AI-powered task assignment suggestion using local Ollama LLM.
Mirrors projects/ai_suggest.py from the Django source.
"""

from __future__ import annotations

import json

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
    except Exception as exc:  # noqa: BLE001
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
