import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    hr_manager = "hr_manager"
    project_manager = "project_manager"
    team_member = "team_member"


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["User"]] = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), default="")
    last_name: Mapped[str] = mapped_column(String(150), default="")
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.team_member)
    skills: Mapped[str] = mapped_column(Text, default="")
    avatar: Mapped[str | None] = mapped_column(String(300), nullable=True)
    reward_points: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    department: Mapped["Department | None"] = relationship("Department", back_populates="members")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="recipient")  # noqa: F821
    chat_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="author")  # noqa: F821

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def skills_list(self) -> list[str]:
        return [s.strip() for s in self.skills.split(",") if s.strip()]


# Avoid circular import — imported at module level in alembic env
from app.models.notifications import Notification  # noqa: E402, F401
from app.models.messaging import ChatMessage  # noqa: E402, F401
