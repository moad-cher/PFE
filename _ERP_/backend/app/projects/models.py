import enum
from datetime import date, datetime

from sqlalchemy import (
    Column, Date, DateTime, Enum, ForeignKey, Integer,
    String, Table, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

# ── Association tables ────────────────────────────────────────────────────────

project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

task_assignees = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


# ── Models ────────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manager: Mapped["User"] = relationship("User", foreign_keys=[manager_id])  # noqa: F821
    members: Mapped[list["User"]] = relationship("User", secondary=project_members)  # noqa: F821
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    stories: Mapped[list["Story"]] = relationship("Story", back_populates="project", cascade="all, delete-orphan")
    statuses: Mapped[list["TaskStatus"]] = relationship("TaskStatus", back_populates="project", cascade="all, delete-orphan")
    sprints: Mapped[list["Sprint"]] = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    chat_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="project")  # noqa: F821
    config: Mapped["ProjectConfig | None"] = relationship("ProjectConfig", back_populates="project", uselist=False, cascade="all, delete-orphan")

    @property
    def progress(self) -> int:
        total = len(self.tasks)
        if total == 0:
            return 0
        done = sum(1 for t in self.tasks if t.status == "done")
        return int((done / total) * 100)


class TaskStatus(Base):
    __tablename__ = "task_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(7), default="#3498db")

    project: Mapped["Project"] = relationship("Project", back_populates="statuses")


class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class SprintStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    goal: Mapped[str] = mapped_column(Text, default="")
    retrospective: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[SprintStatus] = mapped_column(Enum(SprintStatus), default=SprintStatus.draft)

    project: Mapped["Project"] = relationship("Project", back_populates="sprints")
    stories: Mapped[list["Story"]] = relationship("Story", back_populates="sprint")


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    sprint_id: Mapped[int | None] = mapped_column(ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="todo")
    points: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="stories")
    sprint: Mapped["Sprint | None"] = relationship("Sprint", back_populates="stories")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="story", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="todo")
    priority: Mapped[PriorityEnum] = mapped_column(Enum(PriorityEnum), default=PriorityEnum.medium)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_suggestions: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    story: Mapped["Story"] = relationship("Story", back_populates="tasks")
    assigned_to: Mapped[list["User"]] = relationship("User", secondary=task_assignees)  # noqa: F821
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    chat_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="task")  # noqa: F821


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    task: Mapped["Task"] = relationship("Task", back_populates="comments")
    author: Mapped["User"] = relationship("User")  # noqa: F821


class RewardLog(Base):
    __tablename__ = "reward_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User")  # noqa: F821
    task: Mapped["Task | None"] = relationship("Task")


class ProjectConfig(Base):
    __tablename__ = "project_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), unique=True)
    points_on_time: Mapped[int] = mapped_column(Integer, default=10)
    points_late: Mapped[int] = mapped_column(Integer, default=3)
    notify_deadline_days: Mapped[int] = mapped_column(Integer, default=2)
    sprint_duration_days: Mapped[int] = mapped_column(Integer, default=14)

    project: Mapped["Project"] = relationship("Project", back_populates="config")


from app.messaging.models import ChatMessage  # noqa: E402, F401
