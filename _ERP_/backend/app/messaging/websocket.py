import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.websockets.auth import extract_ws_token, get_ws_user
from app.users.models import User
from app.messaging.models import ChatMessage
from app.projects.models import Project, Task
from app.websockets.manager import ws_manager

router = APIRouter()


async def _accept_ws(ws: WebSocket):
    # Echo a fixed subprotocol name; client sent Bearer token which we don't echo back.
    subprotocols = ws.scope.get("subprotocols", [])
    if subprotocols:
        await ws.accept(subprotocol="chat")
        return
    await ws.accept()


def _msg_payload(msg: ChatMessage, user: User) -> dict:
    return {
        "type": "message",
        "id": msg.id,
        "user_id": user.id,
        "username": user.username,
        "user": {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": user.avatar,
        },
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@router.websocket("/ws/chat/{room_type}/{pk}")
async def ws_chat(ws: WebSocket, room_type: str, pk: int):
    """
    room_type : "project" | "task"
    pk        : the project or task id
    """
    accepted = False

    async def close_policy(reason: str):
        nonlocal accepted
        if not accepted:
            await _accept_ws(ws)
            accepted = True
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason=reason)

    token = extract_ws_token(ws)
    
    user = await get_ws_user(token)
    if user is None:
        await close_policy("Invalid or expired token")
        return

    await _accept_ws(ws)
    accepted = True

    if room_type != "project":
        await ws.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid chat room type")
        return

    # Resolve project_id and enforce membership check
    project_id = pk

    async with AsyncSessionLocal() as db:
        proj_res = await db.execute(
            select(Project).where(Project.id == project_id)
            .options(selectinload(Project.members))
        )
        project = proj_res.scalar_one_or_none()
        if project is None:
            await close_policy("Project not found")
            return
        is_member = (
            user.role in ("admin", "hr_manager")
            or any(m.user_id == user.id for m in project.members)
        )
        if not is_member:
            await close_policy("Not a member of this project")
            return

    room = f"chat_{room_type}_{pk}"
    await ws_manager.connect(ws, room, user_id=user.id)

    # ── Push recent history ────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        q = (
            select(ChatMessage)
            .where(ChatMessage.project_id == pk)
            .options(selectinload(ChatMessage.author))
            .order_by(ChatMessage.created_at.desc())
            .limit(50)
        )
        msgs = (await db.execute(q)).scalars().all()

    await ws.send_json({
        "type": "history",
        "messages": [
            {
                "id": m.id,
                "user_id": m.author_id,
                "username": m.author.username,
                "user": {
                    "id": m.author.id,
                    "username": m.author.username,
                    "first_name": m.author.first_name,
                    "last_name": m.author.last_name,
                    "avatar": m.author.avatar,
                },
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in reversed(msgs)
        ],
    })

    # ── Presence: broadcast join ───────────────────────────────────────
    online = ws_manager.get_users_in_room(room)
    await ws_manager.broadcast(room, {
        "type": "presence",
        "event": "join",
        "user_id": user.id,
        "username": user.username,
        "online_count": len(online),
    })

    # ── Message loop ──────────────────────────────────────────────────
    try:
        while True:
            raw: str = await ws.receive_text()
            raw = raw.strip()
            if not raw:
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                # Treat plain text as a chat message (backward-compat)
                data = {"type": "message", "content": raw}

            event_type = data.get("type", "message")

            if event_type == "ping":
                await ws.send_json({"type": "pong"})

            elif event_type == "typing":
                await ws_manager.broadcast(room, {
                    "type": "typing",
                    "user_id": user.id,
                    "username": user.username,
                })

            elif event_type == "message":
                content = str(data.get("content", "")).strip()
                if not content:
                    continue
                async with AsyncSessionLocal() as db:
                    msg = ChatMessage(
                        project_id=project_id,
                        author_id=user.id,
                        content=content,
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)
                await ws_manager.broadcast(room, _msg_payload(msg, user))

    except WebSocketDisconnect:
        await ws_manager.disconnect(ws, room)
        online = ws_manager.get_users_in_room(room)
        await ws_manager.broadcast(room, {
            "type": "presence",
            "event": "leave",
            "user_id": user.id,
            "username": user.username,
            "online_count": len(online),
        })
