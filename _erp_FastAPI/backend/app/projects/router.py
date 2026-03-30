from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date

from app.core.deps import get_db, get_current_user
from app.messaging.models import ChatMessage
from app.notifications.service import notify_task_assigned
from app.tasks.ai import suggest_task_assignees
from app.users.models import User
from app.projects.models import Project, ProjectConfig, Task, TaskStatus, project_members
from app.projects.schemas import (
    AISuggestionRead,
    BulkReassignRequest,
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
    return project.manager_id == user.id or user.role == "admin"


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
    result = []
    for member in all_members:
        member_tasks = [t for t in project.tasks if any(a.id == member.id for a in t.assigned_to)]
        done = [t for t in member_tasks if t.status == "done"]
        active = [t for t in member_tasks if t.status != "done"]
        result.append(
            MemberStatsRead(
                user=member,
                tasks_count=len(member_tasks),
                done_count=len(done),
                active_tasks=[TaskRead.model_validate(t) for t in active],
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
    project = await _load_project(pk, db)
    if not _can_access(project, current_user):
        raise HTTPException(403, "Access denied")

    all_members = list({project.manager, *project.members})
    board = sorted(all_members, key=lambda u: u.reward_points, reverse=True)
    return [
        {
            "rank": i + 1,
            "user_id": u.id,
            "username": u.username,
            "full_name": f"{u.first_name} {u.last_name}".strip(),
            "reward_points": u.reward_points,
        }
        for i, u in enumerate(board)
    ]


# ── Bulk reassign ─────────────────────────────────────────────────────────────

@router.post("/{pk}/tasks/bulk-reassign", status_code=200)
async def bulk_reassign(
    pk: int,
    data: BulkReassignRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not _is_manager(project, current_user):
        raise HTTPException(403, "Access denied")

    new_user_res = await db.execute(select(User).where(User.id == data.new_assignee_id))
    new_user = new_user_res.scalar_one_or_none()
    if not new_user:
        raise HTTPException(404, "Assignee not found")

    tasks_res = await db.execute(
        select(Task)
        .where(Task.project_id == pk, Task.id.in_(data.task_ids))
        .options(selectinload(Task.assigned_to))
    )
    tasks = tasks_res.scalars().all()

    for task in tasks:
        if data.action == "replace":
            task.assigned_to = [new_user]
        elif new_user not in task.assigned_to:
            task.assigned_to.append(new_user)
        background_tasks.add_task(
            notify_task_assigned,
            new_user.id,
            task.title,
            project.name,
            task.id,
        )

    await db.commit()
    return {"updated": len(tasks)}


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

    # Build active task counts per member
    all_members = list({project.manager, *project.members})
    active_counts: dict[int, int] = {m.id: 0 for m in all_members}
    for t in project.tasks:
        if t.status != "done":
            for a in t.assigned_to:
                if a.id in active_counts:
                    active_counts[a.id] += 1

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

