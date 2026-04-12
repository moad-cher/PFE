from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case, extract, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user
from app.users.models import User, RoleEnum, Department
from app.projects.models import Project, Task, RewardLog, project_members, task_assignees
from app.hiring.models import Application, JobPosting, ApplicationStatusEnum

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/admin/activity-trend")
async def get_admin_activity_trend(
    days: int = Query(default=30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get activity trends for the last N days (users, tasks, applications)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    cutoff = datetime.now() - timedelta(days=days)

    # Users created per day
    users_result = await db.execute(
        select(
            extract("day", User.created_at).label("day"),
            extract("month", User.created_at).label("month"),
            func.count(User.id).label("count")
        )
        .where(User.created_at >= cutoff)
        .group_by(extract("month", User.created_at), extract("day", User.created_at))
        .order_by(extract("month", User.created_at), extract("day", User.created_at))
    )
    users_by_day = [{"day": int(row.day), "month": int(row.month), "users": row.count} for row in users_result.all()]

    # Tasks completed per day
    tasks_result = await db.execute(
        select(
            extract("day", Task.completed_at).label("day"),
            extract("month", Task.completed_at).label("month"),
            func.count(Task.id).label("count")
        )
        .where(Task.completed_at >= cutoff, Task.status == "done")
        .group_by(extract("month", Task.completed_at), extract("day", Task.completed_at))
        .order_by(extract("month", Task.completed_at), extract("day", Task.completed_at))
    )
    tasks_by_day = [{"day": int(row.day), "month": int(row.month), "tasks": row.count} for row in tasks_result.all()]

    # Applications per day
    apps_result = await db.execute(
        select(
            extract("day", Application.created_at).label("day"),
            extract("month", Application.created_at).label("month"),
            func.count(Application.id).label("count")
        )
        .where(Application.created_at >= cutoff)
        .group_by(extract("month", Application.created_at), extract("day", Application.created_at))
        .order_by(extract("month", Application.created_at), extract("day", Application.created_at))
    )
    apps_by_day = [{"day": int(row.day), "month": int(row.month), "applications": row.count} for row in apps_result.all()]

    return {
        "users": users_by_day,
        "tasks": tasks_by_day,
        "applications": apps_by_day,
    }


@router.get("/hr/pipeline")
async def get_hr_pipeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR pipeline analytics: applications per job, conversion rates."""
    if current_user.role not in ("admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="HR managers and admins only")

    # Applications per job with status breakdown
    jobs_result = await db.execute(
        select(
            JobPosting.id,
            JobPosting.title,
            JobPosting.status,
            func.count(Application.id).label("total_apps"),
        )
        .outerjoin(Application, JobPosting.id == Application.job_id)
        .group_by(JobPosting.id, JobPosting.title, JobPosting.status)
        .order_by(JobPosting.created_at.desc())
    )

    # Bulk status breakdown — one query instead of N per-job queries
    status_bulk = await db.execute(
        select(Application.job_id, Application.status, func.count(Application.id))
        .group_by(Application.job_id, Application.status)
    )
    # Map: job_id -> {status_value: count}
    status_map: dict[int, dict[str, int]] = {}
    for job_id, status, cnt in status_bulk.all():
        status_map.setdefault(job_id, {})[str(status.value)] = cnt

    jobs_data = []
    for row in jobs_result.all():
        status_breakdown = status_map.get(row.id, {})
        jobs_data.append({
            "id": row.id,
            "title": row.title,
            "status": str(row.status),
            "total_applications": row.total_apps,
            "status_breakdown": status_breakdown,
        })

    # Overall conversion rates
    total_apps = await db.execute(select(func.count(Application.id)))
    total_apps = total_apps.scalar_one() or 0

    interviewed = await db.execute(
        select(func.count(Application.id)).where(Application.status == ApplicationStatusEnum.interview)
    )
    interviewed = interviewed.scalar_one() or 0

    accepted = await db.execute(
        select(func.count(Application.id)).where(Application.status == ApplicationStatusEnum.accepted)
    )
    accepted = accepted.scalar_one() or 0

    conversion_rate = (accepted / total_apps * 100) if total_apps > 0 else 0
    interview_rate = (interviewed / total_apps * 100) if total_apps > 0 else 0

    # AI score distribution
    score_result = await db.execute(
        select(
            case(
                (Application.ai_score >= 80, "Excellent (80+)"),
                (Application.ai_score >= 60, "Good (60-79)"),
                (Application.ai_score >= 40, "Fair (40-59)"),
                (Application.ai_score >= 20, "Poor (20-39)"),
                else_="Very Poor (<20)"
            ).label("category"),
            func.count(Application.id)
        )
        .where(Application.ai_score.is_not(None))
        .group_by("category")
    )
    ai_score_distribution = [{"category": cat, "count": c} for cat, c in score_result.all()]

    return {
        "jobs": jobs_data,
        "conversion_metrics": {
            "total_applications": total_apps,
            "interviewed": interviewed,
            "accepted": accepted,
            "conversion_rate": round(conversion_rate, 2),
            "interview_rate": round(interview_rate, 2),
        },
        "ai_score_distribution": ai_score_distribution,
    }


@router.get("/project/{project_id}/overview")
async def get_project_overview(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project manager dashboard: project health, team workload, progress."""
    # Get project
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.manager),
            selectinload(Project.members),
            selectinload(Project.tasks),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check access
    if current_user.role not in ("admin", "hr_manager"):
        if project.manager_id != current_user.id and not any(m.id == current_user.id for m in project.members):
            raise HTTPException(status_code=403, detail="Access denied")

    tasks = project.tasks or []
    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t.status == "done")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    todo_tasks = sum(1 for t in tasks if t.status == "todo")

    completion_rate = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0

    # Task by priority
    priority_counts = {}
    for t in tasks:
        priority = str(t.priority) if hasattr(t, "priority") and t.priority else "medium"
        priority_counts[priority] = priority_counts.get(priority, 0) + 1

    # Team workload
    members = list({project.manager, *project.members})
    workload = []
    for member in members:
        member_tasks = [t for t in tasks if any(a.id == member.id for a in t.assigned_to)]
        active = sum(1 for t in member_tasks if t.status != "done")
        done = sum(1 for t in member_tasks if t.status == "done")
        workload.append({
            "user_id": member.id,
            "username": member.username,
            "full_name": f"{member.first_name} {member.last_name}".strip(),
            "active_tasks": active,
            "completed_tasks": done,
            "total_tasks": len(member_tasks),
        })

    workload.sort(key=lambda x: x["active_tasks"], reverse=True)

    # Progress over time (tasks completed per week)
    four_weeks_ago = datetime.now() - timedelta(weeks=4)
    weekly_result = await db.execute(
        select(
            extract("week", Task.completed_at).label("week"),
            func.count(Task.id).label("count")
        )
        .where(
            Task.project_id == project_id,
            Task.completed_at >= four_weeks_ago,
            Task.status == "done"
        )
        .group_by(extract("week", Task.completed_at))
        .order_by(extract("week", Task.completed_at))
    )
    weekly_progress = [{"week": int(row.week), "completed": row.count} for row in weekly_result.all()]

    return {
        "project_id": project_id,
        "project_name": project.name,
        "completion_rate": round(completion_rate, 2),
        "task_counts": {
            "total": total_tasks,
            "done": done_tasks,
            "in_progress": in_progress,
            "todo": todo_tasks,
        },
        "priority_distribution": priority_counts,
        "team_workload": workload,
        "weekly_progress": weekly_progress,
    }


@router.get("/project-manager/overview")
async def get_project_manager_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project manager overview: all their projects' health."""
    if current_user.role == "admin":
        # Admin sees all projects
        projects_result = await db.execute(
            select(Project)
            .options(selectinload(Project.tasks), selectinload(Project.manager))
        )
        all_projects = projects_result.scalars().all()
    else:
        # PM sees only their projects
        projects_result = await db.execute(
            select(Project)
            .where(
                or_(
                    Project.manager_id == current_user.id,
                    Project.id.in_(
                        select(project_members.c.project_id).where(project_members.c.user_id == current_user.id)
                    )
                )
            )
            .options(selectinload(Project.tasks), selectinload(Project.manager))
        )
        all_projects = projects_result.scalars().all()

    projects_data = []
    for proj in all_projects:
        tasks = proj.tasks or []
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "done")
        completion = (done / total * 100) if total > 0 else 0

        projects_data.append({
            "id": proj.id,
            "name": proj.name,
            "manager": proj.manager.username if proj.manager else "Unknown",
            "total_tasks": total,
            "completed_tasks": done,
            "completion_rate": round(completion, 2),
        })

    # Aggregate stats
    total_projects = len(all_projects)
    total_tasks = sum(p["total_tasks"] for p in projects_data)
    total_completed = sum(p["completed_tasks"] for p in projects_data)
    avg_completion = (total_completed / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "summary": {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "total_completed": total_completed,
            "avg_completion_rate": round(avg_completion, 2),
        },
        "projects": projects_data,
    }


@router.get("/team-member/performance")
async def get_team_member_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Team member performance analytics."""
    user_id = current_user.id

    # Get all tasks assigned to this user
    tasks_result = await db.execute(
        select(Task)
        .where(Task.assigned_to.any(User.id == user_id))
        .options(selectinload(Task.project))
    )
    all_tasks = tasks_result.scalars().all()

    total_tasks = len(all_tasks)
    done_tasks = [t for t in all_tasks if t.status == "done"]
    active_tasks = [t for t in all_tasks if t.status != "done"]

    # On-time vs late completions
    on_time = sum(
        1
        for t in done_tasks
        if t.deadline and t.completed_at and t.completed_at.date() <= t.deadline
    )
    late = len(done_tasks) - on_time

    # Points history (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    points_result = await db.execute(
        select(
            extract("day", RewardLog.created_at).label("day"),
            extract("month", RewardLog.created_at).label("month"),
            func.sum(RewardLog.points).label("points")
        )
        .where(
            RewardLog.user_id == user_id,
            RewardLog.created_at >= thirty_days_ago
        )
        .group_by(extract("month", RewardLog.created_at), extract("day", RewardLog.created_at))
        .order_by(extract("month", RewardLog.created_at), extract("day", RewardLog.created_at))
    )
    points_history = [{"day": int(row.day), "month": int(row.month), "points": row.points or 0} for row in points_result.all()]

    # Task status distribution
    status_counts = {}
    for t in all_tasks:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1

    # Project × Status distribution — one pass, grouped
    project_status_map: dict[str, dict[str, int]] = {}
    for t in all_tasks:
        proj_name = t.project.name if t.project else "Unknown"
        project_status_map.setdefault(proj_name, {})
        project_status_map[proj_name][t.status] = project_status_map[proj_name].get(t.status, 0) + 1

    # Build ordered list for chart: top 5 projects by total, include all known statuses
    project_distribution = [
        {"project": p, "total": sum(v.values()), **v}
        for p, v in sorted(project_status_map.items(), key=lambda x: sum(x[1].values()), reverse=True)[:5]
    ]

    return {
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": len(done_tasks),
            "active_tasks": len(active_tasks),
            "on_time_completions": on_time,
            "late_completions": late,
            "total_reward_points": current_user.reward_points or 0,
        },
        "points_history": points_history,
        "status_distribution": status_counts,
        "project_distribution": project_distribution,
    }
