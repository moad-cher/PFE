from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.users.models import User
from app.notifications.models import Notification
from app.websockets.manager import ws_manager

router = APIRouter()


def _normalize_bearer(token: str) -> str:
    token = (token or "").strip()
    # Handle accidental quoted tokens from client/proxy transformations.
    if len(token) >= 2 and ((token[0] == '"' and token[-1] == '"') or (token[0] == "'" and token[-1] == "'")):
        token = token[1:-1].strip()
    if token.lower().startswith("bearer "):
        return token[7:].strip()
    return token


def _extract_ws_token(ws: WebSocket) -> str:
    # Prefer WebSocket subprotocol/header. Query token remains fallback for compatibility.
    subprotocols = ws.scope.get("subprotocols", [])
    if subprotocols:
        for candidate in subprotocols:
            normalized = _normalize_bearer(candidate)
            if normalized:
                return normalized

    auth_header = ws.headers.get("authorization")
    if auth_header:
        return _normalize_bearer(auth_header)

    # Last fallback: parse raw Sec-WebSocket-Protocol header if present.
    raw_subprotocol_header = ws.headers.get("sec-websocket-protocol")
    if raw_subprotocol_header:
        for candidate in raw_subprotocol_header.split(","):
            normalized = _normalize_bearer(candidate)
            if normalized:
                return normalized

    token = ws.query_params.get("token") or ws.query_params.get("access_token") or ""
    if token:
        return _normalize_bearer(token)

    return ""


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


async def _accept_ws(ws: WebSocket):
    # If client requested a subprotocol, echo one to satisfy strict browser checks.
    subprotocols = ws.scope.get("subprotocols", [])
    if subprotocols:
        await ws.accept(subprotocol=subprotocols[0])
        return
    await ws.accept()


async def _close_auth_failed(ws: WebSocket):
    # Accept then close so dev WS proxies don't report handshake reset noise.
    await _accept_ws(ws)
    await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")


@router.websocket("/ws/notifications")
async def ws_notifications(ws: WebSocket):
    token = _extract_ws_token(ws)

    user = await _get_user(token)
    if user is None:
        await _close_auth_failed(ws)
        return

    await _accept_ws(ws)

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
