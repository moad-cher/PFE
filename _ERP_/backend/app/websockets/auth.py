from fastapi import WebSocket
from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.users.models import User

def normalize_ws_token(token: str) -> str:
    token = (token or "").strip()
    # Handle accidental quoted tokens from client/proxy transformations.
    if len(token) >= 2 and ((token[0] == '"' and token[-1] == '"') or (token[0] == "'" and token[-1] == "'")):
        token = token[1:-1].strip()
    if token.lower().startswith("bearer "):
        return token[7:].strip()
    return token

def extract_ws_token(ws: WebSocket) -> str:
    """
    Extract JWT token from WebSocket handshake.
    Priority: Query Param > Auth Header > Subprotocols.
    """
    # 1. Query Parameter (Most maintainable for WSS browser clients)
    token = ws.query_params.get("token") or ws.query_params.get("access_token")
    if token:
        return normalize_ws_token(token)

    # 2. Authorization Header (Standard for custom clients)
    auth_header = ws.headers.get("authorization")
    if auth_header:
        return normalize_ws_token(auth_header)

    # 3. Subprotocols (Legacy fallback/hacks)
    subprotocols = ws.scope.get("subprotocols", [])
    if subprotocols:
        for candidate in subprotocols:
            normalized = normalize_ws_token(candidate)
            if normalized:
                return normalized

    return ""

async def get_ws_user(token: str) -> User | None:
    """Validate JWT and return active user."""
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
