from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.users.models import User
from app.messaging.models import ChatMessage
from app.projects.models import Project, Task
from app.messaging.schemas import ChatMessageCreate, ChatMessageRead
from app.websockets.manager import ws_manager

router = APIRouter(prefix="/chat", tags=["chat"])


# ── History endpoints ─────────────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=list[ChatMessageRead])
async def project_chat_history(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .options(selectinload(ChatMessage.author))
        .order_by(ChatMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/task/{task_id}", response_model=list[ChatMessageRead])
async def task_chat_history(
    task_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.task_id == task_id)
        .options(selectinload(ChatMessage.author))
        .order_by(ChatMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


# ── REST send (fallback for clients without WebSocket) ────────────────────────

@router.post("/project/{project_id}", response_model=ChatMessageRead, status_code=201)
async def send_project_message(
    project_id: int,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = await db.get(Project, project_id)
    if not proj:
        raise HTTPException(404, "Project not found")
    msg = ChatMessage(project_id=project_id, author_id=current_user.id, content=data.content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg, ["author"])

    payload = {
        "type": "message",
        "id": msg.id,
        "user_id": current_user.id,
        "username": current_user.username,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "avatar": current_user.avatar,
        },
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }
    await ws_manager.broadcast(f"chat_project_{project_id}", payload)
    return msg


@router.post("/task/{task_id}", response_model=ChatMessageRead, status_code=201)
async def send_task_message(
    task_id: int,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_res = await db.execute(select(Task).where(Task.id == task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    msg = ChatMessage(project_id=task.project_id, task_id=task_id, author_id=current_user.id, content=data.content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg, ["author"])

    payload = {
        "type": "message",
        "id": msg.id,
        "user_id": current_user.id,
        "username": current_user.username,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "avatar": current_user.avatar,
        },
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }
    await ws_manager.broadcast(f"chat_task_{task_id}", payload)
    return msg


# ── Delete message ────────────────────────────────────────────────────────────

@router.delete("/message/{message_id}", status_code=204)
async def delete_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Author or admin can delete a chat message."""
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not your message")
    await db.delete(msg)
    await db.commit()
