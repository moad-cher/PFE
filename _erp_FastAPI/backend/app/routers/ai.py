"""
General-purpose AI REST endpoints.

GET  /ai/status          — Ollama health + available models
POST /ai/chat            — Multi-turn ERP assistant
POST /ai/summarize       — Summarize any text
POST /ai/generate-description — Generate a project/task description from a title
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.deps import get_current_user
from app.helpers.ai import ollama_chat, ollama_status
from app.models.accounts import User

router = APIRouter(prefix="/ai", tags=["ai"])

_ERP_SYSTEM_PROMPT = (
    "You are an intelligent ERP assistant for a company management platform. "
    "You help with project management, HR tasks, task planning, employee performance, "
    "and general business operations. "
    "Be concise, professional, and practical. "
    "When asked about specific data (projects, tasks, employees), explain that you "
    "can only access information provided in the conversation."
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    system_prompt: Optional[str] = None   # override default ERP prompt if provided


class ChatResponse(BaseModel):
    reply: str
    model: str


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    max_words: int = Field(100, ge=20, le=500)
    language: str = "English"


class SummarizeResponse(BaseModel):
    summary: str
    model: str


class DescriptionRequest(BaseModel):
    title: str
    context: Optional[str] = None   # e.g. "project", "task", "job posting"
    language: str = "English"


class DescriptionResponse(BaseModel):
    description: str
    model: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
async def ai_status(_: User = Depends(get_current_user)):
    """Check whether Ollama is reachable and list available models."""
    return await ollama_status()


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Multi-turn ERP assistant chat.

    Pass the full conversation history in `messages` on each request.
    The last message should have role "user".

    Example:
        POST /ai/chat
        {
            "messages": [
                {"role": "user", "content": "How do I assign a task?"}
            ]
        }
    """
    system = req.system_prompt or _ERP_SYSTEM_PROMPT
    messages = [m.model_dump() for m in req.messages]
    reply = await ollama_chat(messages, system_prompt=system)
    return ChatResponse(reply=reply, model=settings.OLLAMA_MODEL)


@router.post("/summarize", response_model=SummarizeResponse)
async def ai_summarize(
    req: SummarizeRequest,
    _: User = Depends(get_current_user),
):
    """
    Summarize any block of text.

    Useful for summarizing project descriptions, resumes, meeting notes, etc.
    """
    system = (
        "You are a concise summarization assistant. "
        f"Produce a summary in {req.language}. "
        f"Stay under {req.max_words} words. "
        "Reply with the summary only — no preamble, no labels."
    )
    reply = await ollama_chat(
        [{"role": "user", "content": req.text}],
        system_prompt=system,
    )
    return SummarizeResponse(summary=reply.strip(), model=settings.OLLAMA_MODEL)


@router.post("/generate-description", response_model=DescriptionResponse)
async def ai_generate_description(
    req: DescriptionRequest,
    _: User = Depends(get_current_user),
):
    """
    Generate a professional description for a project, task, or job posting
    based on its title.

    Example:
        {
            "title": "Migrate database to PostgreSQL",
            "context": "project",
            "language": "French"
        }
    """
    context_label = req.context or "item"
    system = (
        f"You are a professional {context_label} description writer. "
        f"Write a clear, concise description in {req.language}. "
        "2–4 sentences. No bullet points. "
        "Reply with the description only."
    )
    prompt = f"Write a description for this {context_label}: {req.title}"
    reply = await ollama_chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system,
    )
    return DescriptionResponse(description=reply.strip(), model=settings.OLLAMA_MODEL)
