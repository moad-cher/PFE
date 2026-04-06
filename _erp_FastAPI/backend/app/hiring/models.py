import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class JobStatusEnum(str, enum.Enum):
    draft = "draft"
    published = "published"
    paused = "paused"
    closed = "closed"


class ContractTypeEnum(str, enum.Enum):
    cdi = "cdi"
    cdd = "cdd"
    stage = "stage"
    freelance = "freelance"


class ApplicationStatusEnum(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    interview = "interview"
    accepted = "accepted"
    rejected = "rejected"


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    required_skills: Mapped[str] = mapped_column(Text, nullable=False, default="")
    contract_type: Mapped[ContractTypeEnum] = mapped_column(Enum(ContractTypeEnum), default=ContractTypeEnum.cdi)
    location: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[JobStatusEnum] = mapped_column(Enum(JobStatusEnum), default=JobStatusEnum.draft)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by: Mapped["User"] = relationship("User")  # noqa: F821
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="job", cascade="all, delete-orphan")

    @property
    def is_open(self) -> bool:
        from datetime import date
        return self.status == JobStatusEnum.published and (self.deadline is None or self.deadline >= date.today())

    @property
    def application_count(self) -> int:
        return len(self.applications)

    @property
    def skills_list(self) -> list[str]:
        return [s.strip() for s in self.required_skills.split(",") if s.strip()]


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id", ondelete="CASCADE"))
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), default="")
    cover_letter: Mapped[str] = mapped_column(Text, default="")
    resume: Mapped[str] = mapped_column(String(300), nullable=False)   # file path
    resume_text: Mapped[str] = mapped_column(Text, default="")
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_analysis: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ApplicationStatusEnum] = mapped_column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped["JobPosting"] = relationship("JobPosting", back_populates="applications")
    interviews: Mapped[list["Interview"]] = relationship("Interview", back_populates="application", cascade="all, delete-orphan")

    @property
    def candidate_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def candidate_email(self) -> str:
        return self.email


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped["Application"] = relationship("Application", back_populates="interviews")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])  # noqa: F821
