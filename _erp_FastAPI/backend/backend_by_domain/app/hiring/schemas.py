from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr

from app.hiring.models import ApplicationStatusEnum, ContractTypeEnum, JobStatusEnum


class JobPostingCreate(BaseModel):
    title: str
    description: str
    required_skills: str = ""
    contract_type: ContractTypeEnum = ContractTypeEnum.cdi
    location: str = ""
    status: JobStatusEnum = JobStatusEnum.draft
    deadline: Optional[date] = None


class JobPostingRead(BaseModel):
    id: int
    title: str
    description: str
    required_skills: str
    contract_type: ContractTypeEnum
    location: str
    status: JobStatusEnum
    deadline: Optional[date] = None
    application_count: int = 0
    is_open: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    contract_type: Optional[ContractTypeEnum] = None
    location: Optional[str] = None
    status: Optional[JobStatusEnum] = None
    deadline: Optional[date] = None


class ApplicationCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    cover_letter: str = ""


class ApplicationRead(BaseModel):
    id: int
    job_id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    cover_letter: str
    resume: str
    resume_text: str
    ai_score: Optional[float]
    ai_analysis: str
    status: ApplicationStatusEnum
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationDetailRead(ApplicationRead):
    """ApplicationRead enriched with parsed AI JSON and interview list."""
    ai_data: Optional[dict[str, Any]] = None
    interviews: list["InterviewRead"] = []


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatusEnum


# ── Interview ─────────────────────────────────────────────────────────────────

class InterviewCreate(BaseModel):
    scheduled_at: datetime
    location: str = ""
    notes: str = ""


class InterviewRead(BaseModel):
    id: int
    application_id: int
    scheduled_at: datetime
    location: str
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


ApplicationDetailRead.model_rebuild()
