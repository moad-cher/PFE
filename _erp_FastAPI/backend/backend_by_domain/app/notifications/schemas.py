from datetime import datetime

from pydantic import BaseModel

from app.notifications.models import NotifTypeEnum


class NotificationRead(BaseModel):
    id: int
    type: NotifTypeEnum
    title: str
    message: str
    link: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
