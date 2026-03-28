from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os

from app.core.config import settings
from app.notifications.scheduler import deadline_scheduler

# Domain routers
from app.auth.router import router as auth_router
from app.users.router import router as users_router, dept_router
from app.projects.router import router as projects_router
from app.tasks.router import router as tasks_router
from app.hiring.router import router as hiring_router
from app.notifications.router import router as notifications_router
from app.messaging.router import router as messaging_router
from app.ai.router import router as ai_router

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

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routers
app.include_router(auth_router,          tags=["auth"])
app.include_router(users_router,         tags=["users"])
app.include_router(dept_router,          tags=["departments"])
app.include_router(projects_router,      tags=["projects"])
app.include_router(tasks_router,         tags=["tasks"])
app.include_router(hiring_router,        tags=["hiring"])
app.include_router(notifications_router, tags=["notifications"])
app.include_router(messaging_router,     tags=["chat"])
app.include_router(ai_router,            tags=["ai"])

# WebSocket routers
app.include_router(ws_chat_router)
app.include_router(ws_notif_router)
app.include_router(ws_ai_router)

# Static files
media_dir = settings.MEDIA_DIR
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.get("/")
async def health():
    return {"status": "ok"}
