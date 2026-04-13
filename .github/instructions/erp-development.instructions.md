---
description: "Use when editing ERP application code in this repo, including FastAPI backend domains and React frontend flows."
name: "ERP Development Rules"
applyTo: "_erp_FastAPI/{frontend,backend}/**"
---
# ERP Development Rules

## Stack
- **Backend**: FastAPI + SQLAlchemy async + alembic + PostgreSQL/asyncpg
- **Frontend**: React + Vite + Tailwind + Axios
- **Auth**: JWT (`python-jose`), `OAuth2PasswordBearer`; JWT via `?token=` query in WebSockets
- **AI**: Ollama (local LLM), non-streaming in `app/ai/service.py`, streaming in `app/ai/websocket.py`
- **Real-time**: Native FastAPI WebSockets (`app/websockets/`)
- **Background**: `asyncio` tasks + `BackgroundTasks`; scheduler in `app/notifications/scheduler.py`, started via `lifespan` in `main.py`

## Key files
- `app/main.py` — app entry, lifespan, CORS (hardcoded localhost), all routers registered
- `app/core/deps.py` — `get_db`, `get_current_user`, `require_roles(*roles)`
- `app/core/security.py` — `create_access_token`, `decode_token` (user_id only, no version/revocation)
- `app/core/database.py` — `create_async_engine`, `AsyncSessionLocal`
- `app/core/config.py` — `Settings` from pydantic-settings, reads `.env`
- `app/models/` — SQLAlchemy models (Base in `app/core/base.py`, NOT `app/models/base.py`)
- `app/schemas/` — Pydantic v2, `model_config = {"from_attributes": True}` throughout
- `app/routers/` — thin; business logic in `app/helpers/` or domain services
- `app/websockets/` — `manager.py` (ConnectionManager), `chat.py`, `notifications.py`, `ai.py`

## Critical patterns — follow these exactly
1. **Async everything**: never `import fitz` or `open()` directly in async functions — wrap with `asyncio.to_thread()`
2. **Router thinness**: no business logic in routers; call a service/helper that returns data
3. **Error handling**: do NOT swallow exceptions silently — log and raise or return a typed error
4. **Role enforcement**: always use `require_roles()` decorator server-side, never trust UI
5. **DB efficiency**: use `selectinload`/`joinedload` for relationships; avoid loading all rows then filtering in Python; use `UPDATE ... WHERE` not loop-over-rows
6. **Logging**: use `logging.getLogger(__name__)` — no `print()` in production paths
7. **Token handling**: JWT goes in `?token=` query param for WS only (not in headers)

## Common roles
`admin`, `hr_manager`, `project_manager`, `team_member`

## Sync rule
When a feature changes, update: route/schema/model → frontend page/API call → role-gating (Navbar, ProtectedRoute)
