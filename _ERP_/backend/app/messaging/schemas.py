from datetime import datetime

from pydantic import BaseModel

from app.users.schemas import UserBrief


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageRead(BaseModel):
    id: int
    project_id: int
    author: UserBrief
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
