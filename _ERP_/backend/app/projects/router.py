from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import Integer, delete, select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date
import logging

from app.core.deps import get_db, get_current_user
from app.messaging.models import ChatMessage
from app.notifications.service import notify_task_assigned
from app.tasks.ai import suggest_task_assignees
from app.users.models import User
from app.projects.models import Project, ProjectConfig, RewardLog, Task, TaskStatus, project_members, task_assignees
from app.projects.schemas import (
    AISuggestionRead,
    KanbanColumnRead,
    MemberStatsRead,
    ProjectConfigRead,
    ProjectConfigUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    TaskRead,
    TaskStatusCreate,
    TaskStatusRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# ── Helpers ───────────────────────────────────────────────────────────────────

DEFAULT_STATUSES = [
    ("À faire",  "todo",        0, "#e74c3c"),
    ("En cours", "in_progress", 1, "#f39c12"),
    ("En revue", "review",      2, "#3498db"),
    ("Terminé",  "done",        3, "#2ecc71"),
]

ESSENTIAL_SLUGS = {"todo", "done"}


def _can_access(project: Project, user: User) -> bool:
    return (
        user.role in ("admin", "hr_manager")
        or project.manager_id == user.id
        or any(m.id == user.id for m in project.members)
    )


def _is_manager(project: Project, user: User) -> bool:
    return project.manager_id == user.id or user.role in ("admin", "project_manager")


async def _load_project(pk: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == pk).options(
            selectinload(Project.manager),
            selectinload(Project.members),
            selectinload(Project.tasks).selectinload(Task.assigned_to),
            selectinload(Project.statuses),
            selectinload(Project.config),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


async def _ensure_default_statuses(project: Project, db: AsyncSession):
    for name, slug, order, color in DEFAULT_STATUSES:
        db.add(TaskStatus(project_id=project.id, name=name, slug=slug, order=order, color=color))


async def _ensure_config(project: Project, db: AsyncSession):
    db.add(ProjectConfig(project_id=project.id))


# ── Projects CRUD ─────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Project).options(
        selectinload(Project.manager),
        selectinload(Project.members),
        selectinload(Project.tasks).selectinload(Task.assigned_to),
    )
    if current_user.role not in ("admin", "hr_manager"):
        q = q.where(
            (Project.manager_id == current_user.id)
            | Project.members.any(User.id == current_user.id)
        )
    projects = (await db.execute(q.order_by(Project.created_at.desc()))).scalars().all()

    my_tasks_res = await db.execute(
        select(Task)
        .where(Task.assigned_to.any(User.id == current_user.id))
        .options(selectinload(Task.assigned_to))
        .order_by(Task.deadline.nullslast(), Task.created_at)
    )
    my_tasks = my_tasks_res.scalars().all()

    return {
        "projects": [ProjectRead.model_validate(p) for p in projects],
        "my_tasks": [TaskRead.model_validate(t) for t in my_tasks],
    }


@router.get("/", response_model=list[ProjectRead])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Project).options(
        selectinload(Project.manager),
        selectinload(Project.members),
        selectinload(Project.tasks),
    )
    if current_user.role not in ("admin", "hr_manager"):
        q = q.where(
            (Project.manager_id == current_user.id)
            | Project.members.any(User.id == current_user.id)
        )
    result = await db.execute(q.order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/stats")
async def project_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project Manager stats: projects per manager, task completion rates, overdue tasks."""
    logger.info(f"project_stats called by user: {current_user.username} (role: {current_user.role})")
    try:
        # For project managers, show only their projects
        # For admins, show all projects
        is_admin = current_user.role == "admin"
        logger.debug(f"is_admin: {is_admin}")
        
        if is_admin:
            # Admin sees all projects
            logger.debug("Querying projects for admin")
            projects_result = await db.execute(
                select(Project).options(
                    selectinload(Project.tasks),
                    selectinload(Project.manager)
                )
            )
            all_projects = projects_result.scalars().all()
            logger.debug(f"Admin found {len(all_projects)} projects")
            
            # Projects per manager
            manager_result = await db.execute(
                select(User.username, func.count(Project.id))
                .select_from(Project)
                .join(User, Project.manager_id == User.id)
                .group_by(User.username)
            )
            projects_per_manager = {username: count for username, count in manager_result.all()}
        else:
            # Project manager sees only their projects
            logger.debug(f"Querying projects for project_manager: {current_user.id}")
            projects_result = await db.execute(
                select(Project)
                .where(
                    or_(
                        Project.manager_id == current_user.id,
                        Project.id.in_(
                            select(project_members.c.project_id)
                            .where(project_members.c.user_id == current_user.id)
                        )
                    )
                )
                .options(selectinload(Project.tasks))
            )
            all_projects = projects_result.scalars().all()
            logger.debug(f"Project manager found {len(all_projects)} projects")
            projects_per_manager = {current_user.username: len([p for p in all_projects if p.manager_id == current_user.id])}
        
        # Calculate task completion rates
        logger.debug(f"Calculating stats for {len(all_projects)} projects")
        total_tasks = 0
        completed_tasks = 0
        overdue_tasks = 0
        today = date.today()
        
        for project in all_projects:
            for task in project.tasks:
                total_tasks += 1
                if task.status == "done":
                    completed_tasks += 1
                elif task.deadline and task.deadline < today and task.status != "done":
                    overdue_tasks += 1
        
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        result = {
            "total_projects": len(all_projects),
            "projects_per_manager": projects_per_manager,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": round(completion_rate, 2),
            "overdue_tasks": overdue_tasks,
            "is_admin_view": is_admin,
        }
        print(f"[DEBUG] Returning stats: {result}")
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in project_stats: {e}"
        print(f"[ERROR] {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(500, f"Error generating stats: {str(e)}")


@router.post("/", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(**data.model_dump(), manager_id=current_user.id)
    db.add(project)
    await db.flush()  # get project.id before committing
    await _ensure_default_statuses(project, db)
    await _ensure_config(project, db)
    await db.commit()
    await db.refresh(project, ["manager", "members", "tasks", "statuses", "config"])
    return project


@router.get("/{pk}", response_model=ProjectRead)
async def get_project(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")
    return project


@router.patch("/{pk}", response_model=ProjectRead)
async def update_project(
    pk: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project, ["manager", "members", "tasks"])
    return project


@router.delete("/{pk}", status_code=204)
async def delete_project(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == pk))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    
    # Delete related chat messages first (FK may not have CASCADE in DB)
    await db.execute(
        delete(ChatMessage).where(ChatMessage.project_id == pk)
    )
    
    # Use raw SQL delete to rely on DB-level CASCADE constraints
    await db.execute(delete(Project).where(Project.id == pk))
    await db.commit()


# ── Project config ────────────────────────────────────────────────────────────

@router.get("/{pk}/config", response_model=ProjectConfigRead)
async def get_config(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")
    if not project.config:
        cfg = ProjectConfig(project_id=pk)
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
        return cfg
    return project.config


@router.patch("/{pk}/config", response_model=ProjectConfigRead)
async def update_config(
    pk: int,
    data: ProjectConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    cfg = project.config
    if not cfg:
        cfg = ProjectConfig(project_id=pk)
        db.add(cfg)
        await db.flush()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cfg, field, value)
    await db.commit()
    await db.refresh(cfg)
    return cfg


# ── Statuses ──────────────────────────────────────────────────────────────────

@router.get("/{pk}/statuses", response_model=list[TaskStatusRead])
async def list_statuses(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")
    return sorted(project.statuses, key=lambda s: s.order)


@router.post("/{pk}/statuses", response_model=TaskStatusRead, status_code=201)
async def create_status(
    pk: int,
    data: TaskStatusCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    status = TaskStatus(**data.model_dump(), project_id=pk)
    db.add(status)
    await db.commit()
    await db.refresh(status)
    return status


@router.delete("/{pk}/statuses/{status_id}", status_code=204)
async def delete_status(
    pk: int,
    status_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")

    target = next((s for s in project.statuses if s.id == status_id), None)
    if not target:
        raise HTTPException(404, "Status not found")
    if target.slug in ESSENTIAL_SLUGS:
        raise HTTPException(400, "Cannot delete essential status column")

    remaining = sorted(
        [s for s in project.statuses if s.id != status_id],
        key=lambda s: s.order,
    )
    if not remaining:
        raise HTTPException(400, "Cannot delete the only status column")

    fallback = remaining[0]
    # migrate tasks to fallback status
    tasks_res = await db.execute(
        select(Task).where(Task.project_id == pk, Task.status == target.slug)
    )
    for task in tasks_res.scalars().all():
        task.status = fallback.slug

    await db.delete(target)
    await db.commit()


# ── Kanban board ──────────────────────────────────────────────────────────────

@router.get("/{pk}/kanban", response_model=list[KanbanColumnRead])
async def kanban_board(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    statuses = sorted(project.statuses, key=lambda s: s.order)
    task_map: dict[str, list[Task]] = {s.slug: [] for s in statuses}
    for task in project.tasks:
        if task.status in task_map:
            task_map[task.status].append(task)

    return [
        KanbanColumnRead(
            status=TaskStatusRead.model_validate(s),
            tasks=[TaskRead.model_validate(t) for t in task_map[s.slug]],
        )
        for s in statuses
    ]


# ── Scrum board ───────────────────────────────────────────────────────────────

_PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3}


@router.get("/{pk}/scrum", response_model=list[TaskRead])
async def scrum_board(
    pk: int,
    status: str | None = Query(None, description="Filter by status slug"),
    assignee_id: int | None = Query(None, description="Filter by assignee user id"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Flat task list sorted by priority then deadline — Scrum backlog view."""
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    tasks = project.tasks
    if status:
        tasks = [t for t in tasks if t.status == status]
    if assignee_id:
        tasks = [t for t in tasks if any(a.id == assignee_id for a in t.assigned_to)]

    tasks = sorted(
        tasks,
        key=lambda t: (
            _PRIORITY_ORDER.get(t.priority.value if hasattr(t.priority, "value") else t.priority, 99),
            t.deadline or date.max,
        ),
    )
    return [TaskRead.model_validate(t) for t in tasks]


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{pk}/members/search", response_model=list)
async def search_members(
    pk: int,
    q: str = Query("", min_length=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search all users (for member add UI), excluding already-members."""
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")

    member_ids = {m.id for m in project.members} | {project.manager_id}
    query = select(User).where(User.id.not_in(member_ids))
    if q:
        pattern = f"%{q}%"
        query = query.where(
            User.username.ilike(pattern)
            | User.first_name.ilike(pattern)
            | User.last_name.ilike(pattern)
        )
    users = (await db.execute(query.limit(20))).scalars().all()
    return [
        {"id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip()}
        for u in users
    ]


@router.get("/{pk}/members", response_model=list[MemberStatsRead])
async def member_stats(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    all_members = list({project.manager, *project.members})
    member_ids = [m.id for m in all_members]

    # Single query: counts per member via the task_assignees secondary table
    if member_ids:
        count_result = await db.execute(
            select(
                task_assignees.c.user_id,
                func.count(Task.id).label("total"),
                func.sum(func.cast(Task.status == "done", Integer)).label("done"),
            )
            .join(Task, task_assignees.c.task_id == Task.id)
            .where(
                task_assignees.c.user_id.in_(member_ids),
                Task.project_id == pk,
            )
            .group_by(task_assignees.c.user_id)
        )
        stats_map = {row.user_id: {"total": row.total, "done": row.done or 0} for row in count_result.all()}
    else:
        stats_map = {}

    # Fetch active tasks per member in a single query (not loaded eagerly)
    active_result = await db.execute(
        select(Task.id, task_assignees.c.user_id)
        .join(task_assignees, Task.id == task_assignees.c.task_id)
        .where(
            task_assignees.c.user_id.in_(member_ids),
            Task.project_id == pk,
            Task.status != "done",
        )
    )
    active_by_user: dict[int, list[int]] = {m.id: [] for m in all_members}
    for row in active_result.all():
        active_by_user[row.user_id].append(row.id)

    # Load active tasks in one query by IDs
    if any(active_by_user.values()):
        all_active_ids = [tid for tids in active_by_user.values() for tid in tids]
        tasks_result = await db.execute(
            select(Task).where(Task.id.in_(all_active_ids)).options(selectinload(Task.assigned_to))
        )
        tasks_by_id = {t.id: t for t in tasks_result.scalars().all()}
        active_tasks_by_user = {
            uid: [TaskRead.model_validate(tasks_by_id[tid]) for tid in tids]
            for uid, tids in active_by_user.items()
        }
    else:
        active_tasks_by_user = {m.id: [] for m in all_members}

    result = []
    for member in all_members:
        stats = stats_map.get(member.id, {"total": 0, "done": 0})
        result.append(
            MemberStatsRead(
                user=member,
                tasks_count=stats["total"],
                done_count=stats["done"],
                active_tasks=active_tasks_by_user.get(member.id, []),
            )
        )
    return result


@router.post("/{pk}/members/{user_id}", status_code=204)
async def add_member(
    pk: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == pk).options(selectinload(Project.members))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user not in project.members:
        project.members.append(user)
        await db.commit()


@router.delete("/{pk}/members/{user_id}", status_code=204)
async def remove_member(
    pk: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == pk).options(selectinload(Project.members))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")
    project.members = [m for m in project.members if m.id != user_id]
    await db.commit()


# ── Leaderboard ───────────────────────────────────────────────────────────────

@router.get("/{pk}/leaderboard")
async def leaderboard(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project leaderboard showing points earned only from tasks in this project."""
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    all_members = list({project.manager, *project.members})
    member_ids = [m.id for m in all_members]

    # Single query: sum points per user for this project, using GROUP BY
    result = await db.execute(
        select(RewardLog.user_id, func.coalesce(func.sum(RewardLog.points), 0).label("total"))
        .join(Task, RewardLog.task_id == Task.id)
        .where(Task.project_id == pk)
        .group_by(RewardLog.user_id)
    )
    member_points = {row.user_id: row.total for row in result.all()}

    board = sorted(all_members, key=lambda u: member_points.get(u.id, 0), reverse=True)

    return [
        {
            "rank": i + 1,
            "user_id": u.id,
            "username": u.username,
            "full_name": f"{u.first_name} {u.last_name}".strip(),
            "reward_points": member_points.get(u.id, 0),
        }
        for i, u in enumerate(board)
    ]




# ── AI assignment suggestion ──────────────────────────────────────────────────

@router.get("/{pk}/tasks/{task_id}/suggest", response_model=AISuggestionRead)
async def ai_suggest(
    pk: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    task_res = await db.execute(
        select(Task)
        .where(Task.id == task_id, Task.project_id == pk)
        .options(selectinload(Task.assigned_to))
    )
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    # Build active task counts per member via GROUP BY query
    all_members = list({project.manager, *project.members})
    member_ids = [m.id for m in all_members]
    active_counts: dict[int, int] = {m.id: 0 for m in all_members}
    if member_ids:
        result = await db.execute(
            select(task_assignees.c.user_id, func.count(Task.id).label("count"))
            .join(Task, task_assignees.c.task_id == Task.id)
            .where(
                task_assignees.c.user_id.in_(member_ids),
                Task.project_id == pk,
                Task.status != "done",
            )
            .group_by(task_assignees.c.user_id)
        )
        for row in result.all():
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

    result = await suggest_task_assignees(task.title, task.description, member_dicts)
    return AISuggestionRead(**result)




