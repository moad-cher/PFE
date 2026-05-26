from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy import Integer, delete, select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date, datetime, timezone
import logging

from app.core.deps import get_db, get_current_user
from app.auth.permissions import (
    is_admin,
    can_manage_hiring,
    can_manage_projects,
    can_access_project,
    can_manage_project,
)
from app.users.models import User, RoleEnum
from app.projects.models import Project, ProjectConfig, RewardLog, Sprint, Story, Task, TaskStatus, SprintStatus, Comment, ProjectMember, ScrumRole, task_assignees
from app.projects.schemas import (
    ProjectConfigRead,
    ProjectConfigUpdate,
    ProjectCreate,
    ProjectMemberRoleUpdate,
    ProjectRead,
    ProjectUpdate,
    SprintCreate,
    SprintRead,
    SprintUpdate,
    StoryCreate,
    StoryRead,
    StoryUpdate,
    StoryOrderUpdate,
    StoryOrderUpdateRequest,
    TaskRead,
    TaskStatusCreate,
    TaskStatusOrderUpdate,
    StatusOrderUpdateRequest,
    TaskStatusRead,
    KanbanColumnRead,
    MemberStatsRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# ── Helpers ───────────────────────────────────────────────────────────────────

DEFAULT_STATUSES = [
    ("To do",  "todo",        0, "#e74c3c"),
    ("In progress", "in_progress", 1, "#f39c12"),
    ("Review", "review",      2, "#3498db"),
    ("Done",  "done",        3, "#2ecc71"),
]

ESSENTIAL_SLUGS = {"todo", "done"}


async def _load_project(pk: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == pk).options(
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.tasks).selectinload(Task.assigned_to),
            selectinload(Project.stories),
            selectinload(Project.statuses),
            selectinload(Project.config),
            selectinload(Project.sprints),
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
        selectinload(Project.members).selectinload(ProjectMember.user),
        selectinload(Project.tasks).selectinload(Task.assigned_to),
        selectinload(Project.stories),
        selectinload(Project.statuses),
        selectinload(Project.config),
        selectinload(Project.sprints),
    )
    if not is_admin(current_user) and not can_manage_hiring(current_user) and not can_manage_projects(current_user):
        q = q.where(
            Project.members.any(ProjectMember.user_id == current_user.id)
        )
    projects = (await db.execute(q.order_by(Project.created_at.desc()))).scalars().all()

    my_tasks_res = await db.execute(
        select(Task)
        .where(Task.assigned_to.any(User.id == current_user.id))
        .options(selectinload(Task.assigned_to))
        .order_by(Task.end_time.nullslast(), Task.created_at)
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
        selectinload(Project.members).selectinload(ProjectMember.user),
        selectinload(Project.tasks).selectinload(Task.assigned_to),
        selectinload(Project.stories),
        selectinload(Project.statuses),
        selectinload(Project.config),
        selectinload(Project.sprints),
    )
    if not is_admin(current_user) and not can_manage_hiring(current_user) and not can_manage_projects(current_user):
        q = q.where(
            Project.members.any(ProjectMember.user_id == current_user.id)
        )
    result = await db.execute(q.order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/stats")
async def project_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        can_see_all = is_admin(current_user) or can_manage_hiring(current_user) or can_manage_projects(current_user)
        if can_see_all:
            projects_result = await db.execute(
                select(Project).options(selectinload(Project.tasks), selectinload(Project.members).selectinload(ProjectMember.user))
            )
            all_projects = projects_result.scalars().all()
            po_result = await db.execute(
                select(User.username, func.count(Project.id))
                .select_from(Project)
                .join(ProjectMember, Project.id == ProjectMember.project_id)
                .join(User, ProjectMember.user_id == User.id)
                .where(ProjectMember.scrum_role == ScrumRole.product_owner)
                .group_by(User.username)
            )
            projects_per_manager = {username: count for username, count in po_result.all()}
        else:
            projects_result = await db.execute(
                select(Project)
                .where(Project.members.any(ProjectMember.user_id == current_user.id))
                .options(selectinload(Project.tasks))
            )
            all_projects = projects_result.scalars().all()
            projects_per_manager = {current_user.username: len(all_projects)}
        
        total_tasks = 0
        completed_tasks = 0
        overdue_tasks = 0
        now_utc = datetime.now(timezone.utc)
        
        for project in all_projects:
            for task in project.tasks:
                total_tasks += 1
                if task.status == "done":
                    completed_tasks += 1
                elif task.end_time and task.end_time < now_utc and task.status != "done":
                    overdue_tasks += 1
        
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "total_projects": len(all_projects),
            "projects_per_manager": projects_per_manager,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": round(completion_rate, 2),
            "overdue_tasks": overdue_tasks,
            "is_admin_view": can_see_all,
        }
    except Exception:
        logger.exception("Error in project_stats")
        raise HTTPException(500, "Error generating project statistics")


@router.post("/", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")
    existing_project = await db.execute(select(Project).where(Project.name == data.name))
    if existing_project.scalars().first():
        raise HTTPException(400, "A project with this name already exists")

    project = Project(**data.model_dump())
    db.add(project)
    project.members.append(ProjectMember(user_id=current_user.id, scrum_role=ScrumRole.product_owner))
    await db.flush()
    await _ensure_default_statuses(project, db)
    await _ensure_config(project, db)
    await db.commit()
    return await _load_project(project.id, db)


@router.get("/{pk}", response_model=ProjectRead)
async def get_project(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
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
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")
    
    if data.name and data.name != project.name:
        existing_project = await db.execute(select(Project).where(Project.name == data.name))
        if existing_project.scalars().first():
            raise HTTPException(400, "A project with this name already exists")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project, ["members", "tasks"])
    return project


@router.delete("/{pk}", status_code=204)
async def delete_project(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.get(Project, pk)
    if not project:
        raise HTTPException(404, "Project not found")
        
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")
    
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
    if not can_access_project(current_user, project):
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
    if not can_manage_project(current_user, project):
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
    if not can_access_project(current_user, project):
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
    if not can_manage_project(current_user, project):
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
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")


    target = next((s for s in project.statuses if s.id == status_id), None)
    if not target:
        raise HTTPException(404, "Status not found")
    if target.slug in ESSENTIAL_SLUGS:
        raise HTTPException(400, "Cannot delete essential status column")

    remaining = sorted([s for s in project.statuses if s.id != status_id], key=lambda s: s.order)
    if not remaining:
        raise HTTPException(400, "Cannot delete the only status column")

    fallback = remaining[0]
    tasks_res = await db.execute(select(Task).where(Task.project_id == pk, Task.status == target.slug))
    for task in tasks_res.scalars().all():
        task.status = fallback.slug

    await db.delete(target)
    await db.commit()


@router.patch("/{pk}/statuses/order")
async def update_status_order(
    pk: int,
    data: StatusOrderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")


    # Validate all statuses exist and collect order info
    status_map = {s.id: s for s in project.statuses}
    for item in data.statuses:
        if item.id not in status_map:
            raise HTTPException(404, f"Status {item.id} not found")

    # Validate essential statuses stay in place by checking their order values
    # todo must have the minimum order, done must have the maximum order
    todo_status = next((s for s in project.statuses if s.slug == 'todo'), None)
    done_status = next((s for s in project.statuses if s.slug == 'done'), None)
    
    if todo_status:
        todo_order = next((item.order for item in data.statuses if item.id == todo_status.id), None)
        min_order = min(item.order for item in data.statuses)
        if todo_order != min_order:
            raise HTTPException(400, "Todo status must have the lowest order value (first)")
    
    if done_status:
        done_order = next((item.order for item in data.statuses if item.id == done_status.id), None)
        max_order = max(item.order for item in data.statuses)
        if done_order != max_order:
            raise HTTPException(400, "Done status must have the highest order value (last)")

    # Update order
    for item in data.statuses:
        status = status_map[item.id]
        status.order = item.order

    await db.commit()
    return {"message": "Order updated"}


# ── Kanban board ──────────────────────────────────────────────────────────────

@router.get("/{pk}/kanban", response_model=list[KanbanColumnRead])
async def kanban_board(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")

    # Find the active sprint
    active_sprint = next((s for s in project.sprints if s.status == SprintStatus.active), None)
    
    # Get tasks for the active sprint (tasks -> story -> active sprint)
    if active_sprint:
        active_story_ids = {s.id for s in project.stories if s.sprint_id == active_sprint.id}
        sprint_tasks = [t for t in project.tasks if t.story_id in active_story_ids]
    else:
        sprint_tasks = []

    # Fetch comment counts for these tasks
    task_ids = [t.id for t in sprint_tasks]
    counts_map = {}
    if task_ids:
        counts_res = await db.execute(
            select(Comment.task_id, func.count(Comment.id))
            .where(Comment.task_id.in_(task_ids))
            .group_by(Comment.task_id)
        )
        counts_map = {task_id: count for task_id, count in counts_res.all()}

    statuses = sorted(project.statuses, key=lambda s: s.order)
    task_map: dict[str, list[Task]] = {s.slug: [] for s in statuses}
    for task in sprint_tasks:
        if task.status in task_map:
            # Attach comments_count to the task object for TaskRead validation
            task.comments_count = counts_map.get(task.id, 0)
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
    sprint_id: str | None = Query(None, description="Filter by sprint id. 'null' for backlog."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")

    tasks = project.tasks
    if status:
        tasks = [t for t in tasks if t.status == status]
    if assignee_id:
        tasks = [t for t in tasks if any(a.id == assignee_id for a in t.assigned_to)]
    
    if sprint_id:
        if sprint_id.lower() == "null":
            # Backlog: Tasks with a story that has no sprint
            tasks = [t for t in tasks if t.story and t.story.sprint_id is None]
        else:
            try:
                sid = int(sprint_id)
                # Tasks in sprint: Tasks whose story belongs to this sprint
                tasks = [t for t in tasks if t.story and t.story.sprint_id == sid]
            except ValueError:
                pass

    tasks = sorted(
        tasks,
        key=lambda t: (
            _PRIORITY_ORDER.get(t.priority.value if hasattr(t.priority, "value") else t.priority, 99),
            t.end_time or datetime.max.replace(tzinfo=timezone.utc),
        ),
    )
    return [TaskRead.model_validate(t) for t in tasks]


async def _validate_sprint_integrity(
    db: AsyncSession,
    project: Project,
    start_date: date,
    end_date: date,
    status: SprintStatus,
    sprint_id: Optional[int] = None,
):
    # 1. Date Check
    if start_date >= end_date:
        raise HTTPException(400, "Sprint end_date must be after start_date")

    # 2. Project Bounds
    if project.start_date and start_date < project.start_date:
        raise HTTPException(400, f"Sprint start_date cannot be before project start_date ({project.start_date})")
    if project.deadline and end_date > project.deadline:
        raise HTTPException(400, f"Sprint end_date cannot be after project deadline ({project.deadline})")

    # 3. Overlap Check
    # We use a query to ensure we catch everything even if project.sprints is stale
    overlap_query = select(Sprint).where(
        Sprint.project_id == project.id,
        Sprint.id != sprint_id if sprint_id else True,
        Sprint.start_date < end_date,
        Sprint.end_date > start_date
    )
    result = await db.execute(overlap_query)
    if result.scalars().first():
        raise HTTPException(400, "Sprint dates overlap with an existing sprint in this project")

    # 4. Active Sprint Lock
    if status == SprintStatus.active:
        active_query = select(Sprint).where(
            Sprint.project_id == project.id,
            Sprint.id != sprint_id if sprint_id else True,
            Sprint.status == SprintStatus.active
        )
        result = await db.execute(active_query)
        if result.scalars().first():
            raise HTTPException(400, "An active sprint already exists for this project")


# ── Sprints ───────────────────────────────────────────────────────────────────

@router.get("/{pk}/sprints", response_model=list[SprintRead])
async def list_sprints(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")
    return project.sprints


@router.post("/{pk}/sprints", response_model=SprintRead, status_code=201)
async def create_sprint(
    pk: int,
    data: SprintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    await _validate_sprint_integrity(
        db, project, data.start_date, data.end_date, data.status
    )

    sprint = Sprint(**data.model_dump(), project_id=pk)
    
    # Automate project start date: if this is the first sprint, 
    # use its start date as the project's start date.
    if not project.sprints:
        project.start_date = sprint.start_date

    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint


@router.patch("/{pk}/sprints/{sprint_id}", response_model=SprintRead)
async def update_sprint(
    pk: int,
    sprint_id: int,
    data: SprintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id, Sprint.project_id == pk))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(404, "Sprint not found")

    # Validate integrity if dates or status change
    eff_start = data.start_date if data.start_date is not None else sprint.start_date
    eff_end = data.end_date if data.end_date is not None else sprint.end_date
    eff_status = data.status if data.status is not None else sprint.status

    await _validate_sprint_integrity(
        db, project, eff_start, eff_end, eff_status, sprint_id=sprint_id
    )
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(sprint, field, value)
    
    if data.status == SprintStatus.completed:
        # Calculate and "freeze" committed points before moving unfinished stories
        stories_res = await db.execute(
            select(Story).where(Story.sprint_id == sprint_id)
        )
        all_sprint_stories = stories_res.scalars().all()
        sprint.committed_points = sum(story.points for story in all_sprint_stories)

        # Find next sprint (earliest non-completed sprint starting after this one)
        next_sprint_res = await db.execute(
            select(Sprint)
            .where(Sprint.project_id == pk, Sprint.id != sprint_id, Sprint.status != SprintStatus.completed)
            .where(Sprint.start_date >= sprint.end_date)
            .order_by(Sprint.start_date.asc())
        )
        next_sprint = next_sprint_res.scalars().first()
        next_sprint_id = next_sprint.id if next_sprint else None

        # Move stories with unfinished tasks
        result = await db.execute(
            select(Story).where(Story.sprint_id == sprint_id).options(selectinload(Story.tasks))
        )
        stories = result.scalars().all()
        for story in stories:
            # A story is considered unfinished if it has no tasks or if any task is not 'done'
            unfinished = (not story.tasks) or any(t.status != "done" for t in story.tasks)
            if unfinished:
                story.sprint_id = next_sprint_id

    await db.commit()
    await db.refresh(sprint)
    return sprint


@router.delete("/{pk}/sprints/{sprint_id}", status_code=204)
async def delete_sprint(
    pk: int,
    sprint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id, Sprint.project_id == pk))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    
    await db.delete(sprint)
    await db.commit()


# ── Stories ───────────────────────────────────────────────────────────────────

@router.get("/{pk}/stories", response_model=list[StoryRead])
async def list_stories(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")
    
    # Sort stories by order explicitly to ensure consistency
    return sorted(project.stories, key=lambda s: s.order)


@router.patch("/{pk}/stories/order")
async def update_stories_order(
    pk: int,
    data: StoryOrderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    story_map = {s.id: s for s in project.stories}
    for item in data.stories:
        if item.id in story_map:
            story_map[item.id].order = item.order
    
    await db.commit()
    return {"message": "Stories reordered"}


@router.post("/{pk}/stories", response_model=StoryRead, status_code=201)
async def create_story(
    pk: int,
    data: StoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    if data.sprint_id:
        sprint = await db.get(Sprint, data.sprint_id)
        if sprint and sprint.status == "completed":
            raise HTTPException(400, "Cannot add stories to a completed sprint")

    # Get max order to set next
    max_order_res = await db.execute(
        select(func.max(Story.order)).where(Story.project_id == pk)
    )
    max_order = max_order_res.scalar() or 0

    story = Story(**data.model_dump(), project_id=pk, order=max_order + 1)
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return story


@router.patch("/{pk}/stories/{story_id}", response_model=StoryRead)
async def update_story(
    pk: int,
    story_id: int,
    data: StoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    result = await db.execute(select(Story).where(Story.id == story_id, Story.project_id == pk))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")

    if data.sprint_id is not None:
        sprint = await db.get(Sprint, data.sprint_id)
        if sprint and sprint.status == "completed":
            raise HTTPException(400, "Cannot move stories to a completed sprint")

    # Apply only fields explicitly sent by client, allowing null to clear sprint_id (move to backlog).
    for field in data.model_fields_set:
        setattr(story, field, getattr(data, field))
    await db.commit()
    await db.refresh(story)
    return story


@router.delete("/{pk}/stories/{story_id}", status_code=204)
async def delete_story(
    pk: int,
    story_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    result = await db.execute(select(Story).where(Story.id == story_id, Story.project_id == pk))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")
    
    await db.delete(story)
    await db.commit()


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{pk}/members/search", response_model=list)
async def search_members(
    pk: int,
    q: str = Query("", min_length=0),
    department_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")


    member_ids = {m.user_id for m in project.members}
    
    # Exclude current members AND users in HR department
    from app.users.models import Department
    hr_dept_q = await db.execute(select(Department.id).where(Department.name.ilike("HR")))
    hr_dept_id = hr_dept_q.scalar_one_or_none()
    
    query = select(User).where(User.id.not_in(member_ids))
    if hr_dept_id:
        query = query.where(User.department_id != hr_dept_id)
        
    if q:
        pattern = f"%{q}%"
        query = query.where(User.username.ilike(pattern) | User.first_name.ilike(pattern) | User.last_name.ilike(pattern))
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    users = (await db.execute(query.limit(20))).scalars().all()
    return [{"id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip()} for u in users]


@router.get("/{pk}/members", response_model=list[MemberStatsRead])
async def member_stats(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")

    all_members = [m.user for m in project.members]
    member_ids = [m.id for m in all_members]

    if member_ids:
        count_result = await db.execute(
            select(
                task_assignees.c.user_id,
                func.count(Task.id).label("total"),
                func.sum(func.cast(Task.status == "done", Integer)).label("done"),
            )
            .join(Task, task_assignees.c.task_id == Task.id)
            .where(task_assignees.c.user_id.in_(member_ids), Task.project_id == pk)
            .group_by(task_assignees.c.user_id)
        )
        stats_map = {row.user_id: {"total": row.total, "done": row.done or 0} for row in count_result.all()}
    else:
        stats_map = {}

    active_result = await db.execute(
        select(Task.id, task_assignees.c.user_id)
        .join(task_assignees, Task.id == task_assignees.c.task_id)
        .where(task_assignees.c.user_id.in_(member_ids), Task.project_id == pk, Task.status != "done")
    )
    active_by_user: dict[int, list[int]] = {m.id: [] for m in all_members}
    for row in active_result.all():
        active_by_user[row.user_id].append(row.id)

    if any(active_by_user.values()):
        all_active_ids = [tid for tids in active_by_user.values() for tid in tids]
        tasks_result = await db.execute(select(Task).where(Task.id.in_(all_active_ids)).options(selectinload(Task.assigned_to)))
        tasks_by_id = {t.id: t for t in tasks_result.scalars().all()}
        active_tasks_by_user = {uid: [TaskRead.model_validate(tasks_by_id[tid]) for tid in tids] for uid, tids in active_by_user.items()}
    else:
        active_tasks_by_user = {m.id: [] for m in all_members}

    result = []
    for item in project.members:
        member = item.user
        stats = stats_map.get(member.id, {"total": 0, "done": 0})
        result.append(MemberStatsRead(user=member, scrum_role=item.scrum_role, tasks_count=stats["total"], done_count=stats["done"], active_tasks=active_tasks_by_user.get(member.id, [])))
    return result


@router.post("/{pk}/members/{user_id}", status_code=204)
async def add_member(
    pk: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.get(Project, pk, options=[selectinload(Project.members)])
    if not project:
        raise HTTPException(404, "Project not found")

    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    
    # Check if user exists and is NOT in HR department
    from app.users.models import Department
    user = await db.get(User, user_id, options=[selectinload(User.department)])
    if not user:
        raise HTTPException(404, "User not found")
    
    if user.department and user.department.name.upper() == "HR":
        raise HTTPException(400, "Members of the HR department cannot be added to projects")
        
    if not any(m.user_id == user.id for m in project.members):
        project.members.append(ProjectMember(user_id=user.id, scrum_role=ScrumRole.team_member))
        await db.commit()


@router.patch("/{pk}/members/{user_id}/role", status_code=204)
async def update_member_role(
    pk: int,
    user_id: int,
    data: ProjectMemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.get(Project, pk, options=[selectinload(Project.members).selectinload(ProjectMember.user)])
    if not project:
        raise HTTPException(404, "Project not found")

    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    member = next((m for m in project.members if m.user_id == user_id), None)
    if not member:
        raise HTTPException(404, "Project member not found")

    if data.scrum_role == ScrumRole.product_owner:
        for other_member in project.members:
            if other_member.user_id != user_id and other_member.scrum_role == ScrumRole.product_owner:
                other_member.scrum_role = ScrumRole.team_member

    member.scrum_role = data.scrum_role
    await db.commit()


@router.delete("/{pk}/members/{user_id}", status_code=204)
async def remove_member(
    pk: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.get(Project, pk, options=[selectinload(Project.members)])
    if not project:
        raise HTTPException(404, "Project not found")

    if not can_manage_project(current_user, project):
        raise HTTPException(403, "Access denied")

    project.members = [m for m in project.members if m.user_id != user_id]
    await db.commit()


# ── Leaderboard ───────────────────────────────────────────────────────────────

@router.get("/{pk}/leaderboard")
async def leaderboard(
    pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")

    all_members = [m.user for m in project.members]
    result = await db.execute(
        select(RewardLog.user_id, func.coalesce(func.sum(RewardLog.points), 0).label("total"))
        .join(Task, RewardLog.task_id == Task.id)
        .where(Task.project_id == pk)
        .group_by(RewardLog.user_id)
    )
    member_points = {row.user_id: row.total for row in result.all()}
    board = sorted(all_members, key=lambda u: member_points.get(u.id, 0), reverse=True)

    return [{"rank": i + 1, "user_id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip(), "reward_points": member_points.get(u.id, 0)} for i, u in enumerate(board)]


# ── AI assignment suggestion ──────────────────────────────────────────────────

@router.post("/{pk}/tasks/{task_id}/suggest")
async def ai_suggest(
    pk: int,
    task_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _load_project(pk, db)
    if not can_access_project(current_user, project):
        raise HTTPException(403, "Access denied")

    task_res = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == pk))
    if not task_res.scalar_one_or_none():
        raise HTTPException(404, "Task not found")

    from app.tasks.ai import run_ai_task_suggestion
    background_tasks.add_task(run_ai_task_suggestion, task_id, pk, current_user.id)
    return {"status": "accepted", "message": "AI is generating suggestions"}
