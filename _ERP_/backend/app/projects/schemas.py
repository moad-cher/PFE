from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, computed_field

from app.projects.models import PriorityEnum
from app.users.schemas import UserBrief


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
    time_slot: str = ""
    deadline: Optional[date] = None
    points: int = 10
    assigned_to_ids: list[int] = []


class TaskRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    status: str
    priority: PriorityEnum
    time_slot: str
    deadline: Optional[date]
    points: int
    completed_at: Optional[datetime]
    created_at: datetime
    assigned_to: list[UserBrief]
    ai_suggestions: Optional[str] = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def is_overdue(self) -> bool:
        return bool(self.deadline and self.completed_at is None and self.deadline < date.today())

    @computed_field
    @property
    def deadline_approaching(self) -> bool:
        if not self.deadline or self.completed_at is not None:
            return False
        return 0 <= (self.deadline - date.today()).days <= 2


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    time_slot: Optional[str] = None
    deadline: Optional[date] = None
    points: Optional[int] = None
    assigned_to_ids: Optional[list[int]] = None


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


# ── ProjectConfig ─────────────────────────────────────────────────────────────

class ProjectConfigRead(BaseModel):
    id: int
    project_id: int
    points_on_time: int
    points_late: int
    notify_deadline_days: int

    model_config = {"from_attributes": True}


class ProjectConfigUpdate(BaseModel):
    points_on_time: Optional[int] = None
    points_late: Optional[int] = None
    notify_deadline_days: Optional[int] = None


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
