"""
WebSocket endpoint for streaming AI responses token-by-token.

WS /ws/ai/stream
(Authenticate via Sec-WebSocket-Protocol: [token])

Protocol (client → server):
    { "prompt": "...", "system": "...(optional)" }

Protocol (server → client):
    { "type": "token",  "token": "..." }          — one chunk at a time
    { "type": "done",   "full":  "..." }           — full response when finished
    { "type": "error",  "message": "..." }         — on any error
    { "type": "status", "reachable": bool, ... }   — response to "status" probe
"""
from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.auth import extract_ws_token, get_ws_user
from app.ai.service import ollama_stream, ollama_status

router = APIRouter()

_DEFAULT_SYSTEM = (
    "You are an intelligent ERP assistant. "
    "Help with project management, HR tasks, task planning, and business operations. "
    "Be concise and professional."
)


@router.websocket("/ws/ai/stream")
async def ws_ai_stream(websocket: WebSocket):
    """
    Streaming AI chat over WebSocket.
    """
    token = extract_ws_token(websocket)
    user = await get_ws_user(token)
    
    if user is None:
        # Accept then close to provide a clean error to the client
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Echo back "ai" as the selected subprotocol if requested, or just accept
    subprotocols = websocket.scope.get("subprotocols", [])
    if subprotocols:
        await websocket.accept(subprotocol="ai")
    else:
        await websocket.accept()

    try:
        while True:
            # ── Receive request ───────────────────────────────────────────────
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            raw = message.get("text") or (message.get("bytes") or b"").decode("utf-8")

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON — expected {\"prompt\": \"...\"}"}
                )
                continue

            # Special probe: {"type": "status"}
            if data.get("type") == "status":
                status = await ollama_status()
                await websocket.send_json({"type": "status", **status})
                continue

            prompt = data.get("prompt", "").strip()
            if not prompt:
                await websocket.send_json(
                    {"type": "error", "message": "Missing or empty 'prompt' field"}
                )
                continue

            system = data.get("system", "").strip() or _DEFAULT_SYSTEM
            messages = [{"role": "user", "content": prompt}]

            # ── Stream tokens ─────────────────────────────────────────────────
            full_response: list[str] = []
            try:
                async for token_chunk in ollama_stream(messages, system_prompt=system):
                    full_response.append(token_chunk)
                    await websocket.send_json({"type": "token", "token": token_chunk})

                await websocket.send_json(
                    {"type": "done", "full": "".join(full_response)}
                )
            except Exception as exc:
                await websocket.send_json({"type": "error", "message": str(exc)})

    except WebSocketDisconnect:
        pass
