from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os

from app.core.config import settings
from app.helpers.scheduler import deadline_scheduler
from app.routers import auth, users, projects, tasks, hiring, notifications, messaging
from app.routers import ai as ai_router
from app.routers.users import dept_router
from app.websockets.chat import router as ws_chat_router
from app.websockets.notifications import router as ws_notif_router
from app.websockets.ai import router as ws_ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(deadline_scheduler())
    yield
    task.cancel()


app = FastAPI(title="ERP API", version="1.0.0", lifespan=lifespan)

# ------------------------------------------------------------------ #
#  CORS — allow React dev server (and any local origin)               #
# ------------------------------------------------------------------ #
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  REST routers                                                        #
# ------------------------------------------------------------------ #
app.include_router(auth.router,          tags=["auth"])
app.include_router(users.router,         tags=["users"])
app.include_router(projects.router,      tags=["projects"])
app.include_router(tasks.router,         tags=["tasks"])
app.include_router(hiring.router,        tags=["hiring"])
app.include_router(notifications.router, tags=["notifications"])
app.include_router(messaging.router,     tags=["chat"])
app.include_router(dept_router,          tags=["departments"])
app.include_router(ai_router.router,     tags=["ai"])

# ------------------------------------------------------------------ #
#  WebSocket routers                                                   #
# ------------------------------------------------------------------ #
app.include_router(ws_chat_router)
app.include_router(ws_notif_router)
app.include_router(ws_ai_router)

# ------------------------------------------------------------------ #
#  Static / media files                                                #
# ------------------------------------------------------------------ #
media_dir = settings.MEDIA_DIR
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.get("/")
async def health():
    return {"status": "ok"}
