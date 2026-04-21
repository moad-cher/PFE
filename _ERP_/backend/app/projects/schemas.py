from datetime import date, datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, computed_field

from app.projects.models import PriorityEnum, SprintStatus
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

    model_config = {"from_attributes": True}


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    retrospective: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[SprintStatus] = None


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
    sprint_id: Optional[int] = None


class TaskRead(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int]
    title: str
    description: str
    status: str
    priority: PriorityEnum
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    points: int
    completed_at: Optional[datetime]
    created_at: datetime
    assigned_to: list[UserBrief]
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
    sprint_id: Optional[int] = None


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


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectRead(BaseModel):
    id: int
    name: str
    description: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    manager: Optional[UserBrief] = None
    members: list[UserBrief] = []
    tasks: list[TaskRead] = []
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


# ── Kanban board ──────────────────────────────────────────────────────────────

class KanbanColumnRead(BaseModel):
    status: TaskStatusRead
    tasks: list[TaskRead]


# ── Member stats ──────────────────────────────────────────────────────────────

class MemberStatsRead(BaseModel):
    user: UserBrief
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
