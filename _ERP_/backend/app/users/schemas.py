from datetime import datetime
from typing import Optional
import re

from pydantic import BaseModel, EmailStr, field_validator

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

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


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

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


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
