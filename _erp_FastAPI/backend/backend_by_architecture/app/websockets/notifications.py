from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.accounts import User
from app.models.notifications import Notification
from app.websockets.manager import ws_manager

router = APIRouter()


async def _get_user(token: str) -> User | None:
    user_id = decode_token(token)
    if user_id is None:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
        return result.scalar_one_or_none()


@router.websocket("/ws/notifications")
async def ws_notifications(ws: WebSocket, token: str = ""):
    """
    Personal notification stream for the authenticated user.
    Room name: "user_{user_id}"

    On connect the server immediately pushes:
      {"type": "unread_count", "count": N}

    Subsequent pushes use:
      {"type": "notification", "id", "notif_type", "title", "message", "link", "is_read", "created_at"}

    Clients may send "ping" to keep the connection alive.
    """
    user = await _get_user(token)
    if user is None:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    room = f"user_{user.id}"
    await ws_manager.connect(ws, room, user_id=user.id)

    # Push current unread count immediately on connect
    async with AsyncSessionLocal() as db:
        count = await db.scalar(
            select(func.count()).where(
                Notification.recipient_id == user.id,
                Notification.is_read.is_(False),
            )
        )
    await ws.send_json({"type": "unread_count", "count": count or 0})

    try:
        # Keep-alive: clients can send "ping", we reply "pong"
        while True:
            msg = await ws.receive_text()
            if msg.strip() == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, room)
