from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.users.models import RoleEnum


class DepartmentCreate(BaseModel):
    name: str
    description: str = ""


class DepartmentRead(BaseModel):
    id: int
    name: str
    description: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""
    role: RoleEnum = RoleEnum.team_member


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: RoleEnum
    skills: str
    avatar: Optional[str]
    reward_points: int
    is_active: bool
    department: Optional[DepartmentRead]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[str] = None
    department_id: Optional[int] = None


class UserAdminUpdate(BaseModel):
    """Fields only admins can change."""
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None
    department_id: Optional[int] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserStats(BaseModel):
    active_projects: int
    tasks_done: int
    tasks_active: int


class UserBrief(BaseModel):
    """Lightweight user representation used inside other schemas."""
    id: int
    username: str
    first_name: str
    last_name: str
    avatar: Optional[str]
    role: RoleEnum

    model_config = {"from_attributes": True}
