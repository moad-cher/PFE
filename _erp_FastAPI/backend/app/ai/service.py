"""
Unified async Ollama helper used by all AI-powered features.
Provides chat, streaming, and health-check utilities.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.core.config import settings

_CHAT_URL = f"{settings.OLLAMA_BASE_URL}/api/chat"
_GEN_URL  = f"{settings.OLLAMA_BASE_URL}/api/generate"
_TAGS_URL = f"{settings.OLLAMA_BASE_URL}/api/tags"


# ── Core Ollama calls ─────────────────────────────────────────────────────────

async def ollama_chat(
    messages: list[dict[str, str]],
    system_prompt: str = "",
    *,
    json_mode: bool = False,
    timeout: float = 120.0,
) -> str:
    """
    Non-streaming chat call.  Returns the full assistant reply as a string.
    ``messages`` is a list of {"role": "user"|"assistant", "content": "..."}
    """
    full_messages: list[dict[str, str]] = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    payload: dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "messages": full_messages,
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(_CHAT_URL, json=payload)
            resp.raise_for_status()
            return resp.json().get("message", {}).get("content", "")
    except httpx.ConnectError:
        return '{"error": "Ollama unreachable — run: ollama serve"}'
    except Exception as exc:  # noqa: BLE001
        return f'{{"error": "{exc}"}}'


async def ollama_stream(
    messages: list[dict[str, str]],
    system_prompt: str = "",
    timeout: float = 120.0,
) -> AsyncIterator[str]:
    """
    Streaming chat call.  Yields each token string as it arrives.
    Last yielded item is the empty string (signals end of stream) or raises.
    """
    full_messages: list[dict[str, str]] = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    payload: dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "messages": full_messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", _CHAT_URL, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if chunk.get("done"):
                        return
    except httpx.ConnectError:
        yield '[ERROR: Ollama unreachable — run: ollama serve]'
    except Exception as exc:  # noqa: BLE001
        yield f"[ERROR: {exc}]"


async def ollama_status() -> dict[str, Any]:
    """
    Returns {"reachable": bool, "model": str, "models": [...]} by querying
    the Ollama /api/tags endpoint.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(_TAGS_URL)
            resp.raise_for_status()
            models = [m["name"] for m in resp.json().get("models", [])]
            return {
                "reachable": True,
                "model": settings.OLLAMA_MODEL,
                "models": models,
            }
    except Exception:  # noqa: BLE001
        return {"reachable": False, "model": settings.OLLAMA_MODEL, "models": []}
