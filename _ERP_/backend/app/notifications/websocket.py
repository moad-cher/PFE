from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.users.models import User
from app.notifications.models import Notification
from app.websockets.manager import ws_manager

router = APIRouter()


async def _get_user(token: str) -> User | None:
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
        return result.scalar_one_or_none()


@router.websocket("/ws/notifications")
async def ws_notifications(ws: WebSocket):
    # Retrieve token from Sec-WebSocket-Protocol header (more secure than query params)
    subprotocols = ws.scope.get("subprotocols", [])
    token = subprotocols[0] if subprotocols else ""
    
    user = await _get_user(token)
    if user is None:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept with the subprotocol we found
    await ws.accept(subprotocol=token)
    
    room = f"user_{user.id}"
    await ws_manager.connect(ws, room, user_id=user.id)

    # Send initial unread count
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.recipient_id == user.id,
                Notification.is_read.is_(False),
            )
        )
        count = result.scalar_one()
        await ws.send_json({"type": "unread_count", "count": count})

    try:
        # Keep-alive: clients can send "ping", we reply "pong"
        while True:
            msg = await ws.receive_text()
            if msg.strip() == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws, room)
