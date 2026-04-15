from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os

from app.core.config import settings
from app.core.media import MEDIA_ROOT
from app.notifications.scheduler import deadline_scheduler

# Domain routers
from app.auth.router import router as auth_router
from app.users.router import router as users_router, dept_router, admin_router
from app.projects.router import router as projects_router
from app.tasks.router import router as tasks_router
from app.hiring.router import router as hiring_router
from app.notifications.router import router as notifications_router
from app.messaging.router import router as messaging_router
from app.ai.router import router as ai_router
from app.analytics.router import router as analytics_router

# WebSocket routes
from app.messaging.websocket import router as ws_chat_router
from app.notifications.websocket import router as ws_notif_router
from app.ai.websocket import router as ws_ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(deadline_scheduler())
    yield
    task.cancel()


app = FastAPI(title="ERP API", version="1.0.0", lifespan=lifespan)

# CORS configuration - allow local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,  # Must be False when allow_origins uses "*", but JWT auth uses headers not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routers
app.include_router(auth_router,          tags=["auth"])
app.include_router(users_router,         tags=["users"])
app.include_router(admin_router,         tags=["admin"])
app.include_router(dept_router,          tags=["departments"])
app.include_router(projects_router,      tags=["projects"])
app.include_router(tasks_router,         tags=["tasks"])
app.include_router(hiring_router,        tags=["hiring"])
app.include_router(notifications_router, tags=["notifications"])
app.include_router(messaging_router,     tags=["chat"])
app.include_router(ai_router,            tags=["ai"])
app.include_router(analytics_router,     tags=["analytics"])

# WebSocket routers
app.include_router(ws_chat_router)
app.include_router(ws_notif_router)
app.include_router(ws_ai_router)

# Static files - serve media directory
os.makedirs(MEDIA_ROOT, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_ROOT)), name="media")


@app.get("/")
async def health():
    return {"status": "ok"}


# Fallback middleware: ensure CORS headers are present on responses.
# This helps development setups where a response can sometimes be returned
# without the CORS header (causing the browser to block it) even though the
# server processed the request. It echoes back the `Origin` header when
# present so the browser accepts the response.
@app.middleware("http")
async def ensure_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin and "access-control-allow-origin" not in (h.lower() for h in response.headers.keys()):
        response.headers["Access-Control-Allow-Origin"] = origin
        # Allow common request headers and methods used by the SPA
        response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
        response.headers.setdefault("Access-Control-Allow-Headers", "Authorization,Content-Type")
        response.headers.setdefault("Vary", "Origin")
    return response
