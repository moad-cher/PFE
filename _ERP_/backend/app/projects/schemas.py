from datetime import date, datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, computed_field

from app.projects.models import PriorityEnum, SprintStatus, ScrumRole
from app.users.schemas import UserBrief


# ── Sprint ────────────────────────────────────────────────────────────────────

class SprintCreate(BaseModel):
    name: str
    goal: str = ""
    retrospective: str = ""
    start_date: date
    end_date: date
    status: SprintStatus = SprintStatus.draft


class SprintRead(BaseModel):
    id: int
    project_id: int
    name: str
    goal: str
    retrospective: str
    start_date: date
    end_date: date
    status: SprintStatus
    committed_points: Optional[int] = None

    model_config = {"from_attributes": True}


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    retrospective: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[SprintStatus] = None
    committed_points: Optional[int] = None


# ── Story ─────────────────────────────────────────────────────────────────────

class StoryCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    points: int = 0
    order: int = 0
    sprint_id: Optional[int] = None


class StoryRead(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int]
    title: str
    description: str
    status: str
    points: int
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    points: Optional[int] = None
    order: Optional[int] = None
    sprint_id: Optional[int] = None


class StoryOrderUpdate(BaseModel):
    id: int
    order: int


class StoryOrderUpdateRequest(BaseModel):
    stories: list[StoryOrderUpdate]


# ── TaskStatus ────────────────────────────────────────────────────────────────

class TaskStatusRead(BaseModel):
    id: int
    name: str
    slug: str
    order: int
    color: str

    model_config = {"from_attributes": True}


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    priority: PriorityEnum = PriorityEnum.medium
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    points: int = 10
    assigned_to_ids: list[int] = []
    story_id: int
    is_blocked: bool = False
    blocker_reason: Optional[str] = None


class TaskRead(BaseModel):
    id: int
    project_id: int
    story_id: int
    title: str
    description: str
    status: str
    priority: PriorityEnum
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    points: int
    completed_at: Optional[datetime]
    is_blocked: bool = False
    blocker_reason: Optional[str] = None
    created_at: datetime
    assigned_to: list[UserBrief]
    comments_count: int = 0
    ai_suggestions: Optional[str] = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def is_overdue(self) -> bool:
        return bool(self.end_time and self.completed_at is None and self.end_time < datetime.now(timezone.utc))

    @computed_field
    @property
    def deadline_approaching(self) -> bool:
        if not self.end_time or self.completed_at is not None:
            return False
        now_utc = datetime.now(timezone.utc)
        delta = self.end_time - now_utc
        return timedelta(0) <= delta <= timedelta(days=2)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    points: Optional[int] = None
    assigned_to_ids: Optional[list[int]] = None
    story_id: Optional[int] = None
    is_blocked: Optional[bool] = None
    blocker_reason: Optional[str] = None


# ── ProjectConfig ─────────────────────────────────────────────────────────────

class ProjectConfigRead(BaseModel):
    id: int
    project_id: int
    points_on_time: int
    points_late: int
    notify_deadline_days: int
    sprint_duration_days: int

    model_config = {"from_attributes": True}


class ProjectConfigUpdate(BaseModel):
    points_on_time: Optional[int] = None
    points_late: Optional[int] = None
    notify_deadline_days: Optional[int] = None
    sprint_duration_days: Optional[int] = None

# ── Project Member ───────────────────────────────────

class ProjectMemberRead(BaseModel):
    user_id: int
    scrum_role: ScrumRole
    user: UserBrief

    model_config = {"from_attributes": True}


class ProjectMemberRoleUpdate(BaseModel):
    scrum_role: ScrumRole

# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None


class ProjectRead(BaseModel):
    id: int
    name: str
    description: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None
    members: list[ProjectMemberRead] = []
    tasks: list[TaskRead] = []
    stories: list[StoryRead] = []
    statuses: list[TaskStatusRead] = []
    sprints: list[SprintRead] = []
    config: Optional[ProjectConfigRead] = None
    progress: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None


# ── Comment ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str


class CommentRead(BaseModel):
    id: int
    task_id: int
    author: UserBrief
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── TaskStatus create ─────────────────────────────────────────────────────────

class TaskStatusCreate(BaseModel):
    name: str
    slug: str
    order: int = 0
    color: str = "#3498db"


class TaskStatusOrderUpdate(BaseModel):
    id: int
    order: int


class StatusOrderUpdateRequest(BaseModel):
    statuses: list[TaskStatusOrderUpdate]

class TaskStatusCreateLegacy(BaseModel):
    name: str
    slug: str
    order: int = 0
    color: str = "#3498db"


# ── Kanban board ──────────────────────────────────────────────────────────────

class KanbanColumnRead(BaseModel):
    status: TaskStatusRead
    tasks: list[TaskRead]


# ── Member stats ──────────────────────────────────────────────────────────────

class MemberStatsRead(BaseModel):
    user: UserBrief
    scrum_role: ScrumRole
    tasks_count: int
    done_count: int
    active_tasks: list[TaskRead]


# ── Task move ─────────────────────────────────────────────────────────────────

class TaskMoveRequest(BaseModel):
    status: str  # slug of the target TaskStatus




# ── AI suggestion ─────────────────────────────────────────────────────────────

class AISuggestedMember(BaseModel):
    user_id: int
    username: str
    full_name: str
    skills: str
    active_tasks: int
    confidence: float = 0.0
    reason: str = ""


class AISuggestionRead(BaseModel):
    members: list[AISuggestedMember]
    error: Optional[str] = None
