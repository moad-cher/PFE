"""
Comprehensive script to build domain-driven backend structure
This script will reorganize backend_by_architecture into backend_by_domain
"""
import os
import shutil

SRC_BASE = r"c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_architecture"
DEST_BASE = r"c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain"

def copy_file_with_content_transform(src, dest, transformations=None):
    """Copy file and optionally transform import statements"""
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if transformations:
        for old, new in transformations.items():
            content = content.replace(old, new)
    
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ {os.path.basename(dest)}")

def main():
    print("="*70)
    print("  Building Domain-Driven Backend Structure")
    print("="*70)
    
    # Create base app directory
    app_dest = os.path.join(DEST_BASE, "app")
    os.makedirs(app_dest, exist_ok=True)
    
    # Import transformations for each domain
    common_transforms = {
        "from app.models.accounts import": "from app.users.models import",
        "from app.models.projects import": "from app.projects.models import",
        "from app.models.hiring import": "from app.hiring.models import",
        "from app.models.messaging import": "from app.messaging.models import",
        "from app.models.notifications import": "from app.notifications.models import",
        "from app.models.base import": "from app.core.base import",
        "from app.schemas.user import": "from app.users.schemas import",
        "from app.schemas.project import": "from app.projects.schemas import",
        "from app.schemas.hiring import": "from app.hiring.schemas import",
        "from app.schemas.messaging import": "from app.messaging.schemas import",
        "from app.schemas.notification import": "from app.notifications.schemas import",
        "from app.schemas.token import": "from app.auth.schemas import",
        "from app.helpers.notifications import": "from app.notifications.service import",
        "from app.helpers.scheduler import": "from app.notifications.scheduler import",
        "from app.helpers.ai import": "from app.ai.service import",
        "from app.helpers.resume_ai import": "from app.hiring.ai import",
        "from app.helpers.task_ai import": "from app.tasks.ai import",
        "from app.websockets.manager import": "from app.websockets.manager import",
    }
    
    print("\n[1/11] Creating CORE infrastructure...")
    core_files = [
        ("app/core/__init__.py", "app/core/__init__.py"),
        ("app/core/config.py", "app/core/config.py"),
        ("app/core/database.py", "app/core/database.py"),
        ("app/core/security.py", "app/core/security.py"),
        ("app/models/base.py", "app/core/base.py"),
    ]
    for src_rel, dest_rel in core_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    # Special handling for deps.py (needs User import update)
    src_deps = os.path.join(SRC_BASE, "app/core/deps.py")
    dest_deps = os.path.join(DEST_BASE, "app/core/deps.py")
    deps_transforms = {
        **common_transforms,
        "from app.models.accounts import User": "# User import moved to function to avoid circular dependency",
    }
    copy_file_with_content_transform(src_deps, dest_deps, deps_transforms)
    
    print("\n[2/11] Creating WEBSOCKETS manager...")
    ws_files = [
        ("app/websockets/__init__.py", "app/websockets/__init__.py"),
        ("app/websockets/manager.py", "app/websockets/manager.py"),
    ]
    for src_rel, dest_rel in ws_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    print("\n[3/11] Creating AUTH domain...")
    os.makedirs(os.path.join(app_dest, "auth"), exist_ok=True)
    auth_files = [
        ("app/routers/auth.py", "app/auth/router.py"),
        ("app/schemas/token.py", "app/auth/schemas.py"),
    ]
    for src_rel, dest_rel in auth_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    # Create auth __init__.py
    with open(os.path.join(app_dest, "auth", "__init__.py"), 'w') as f:
        f.write("# Authentication domain\n")
    
    print("\n[4/11] Creating USERS domain...")
    os.makedirs(os.path.join(app_dest, "users"), exist_ok=True)
    users_files = [
        ("app/models/accounts.py", "app/users/models.py"),
        ("app/routers/users.py", "app/users/router.py"),
        ("app/schemas/user.py", "app/users/schemas.py"),
    ]
    for src_rel, dest_rel in users_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "users", "__init__.py"), 'w') as f:
        f.write("# Users domain\n")
    
    print("\n[5/11] Creating PROJECTS domain...")
    os.makedirs(os.path.join(app_dest, "projects"), exist_ok=True)
    # Extract Project, ProjectConfig, TaskStatus from projects.py
    src_projects_models = os.path.join(SRC_BASE, "app/models/projects.py")
    dest_projects_models = os.path.join(DEST_BASE, "app/projects/models.py")
    
    # Need to split projects.py into projects and tasks models
    # For now, copy to projects and we'll handle tasks separately
    if os.path.exists(src_projects_models):
        with open(src_projects_models, 'r', encoding='utf-8') as f:
            content = f.read()
        # Transform imports
        for old, new in common_transforms.items():
            content = content.replace(old, new)
        # Write to projects models
        os.makedirs(os.path.dirname(dest_projects_models), exist_ok=True)
        with open(dest_projects_models, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ models.py")
    
    projects_files = [
        ("app/routers/projects.py", "app/projects/router.py"),
        ("app/schemas/project.py", "app/projects/schemas.py"),
    ]
    for src_rel, dest_rel in projects_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "projects", "__init__.py"), 'w') as f:
        f.write("# Projects domain\n")
    
    print("\n[6/11] Creating TASKS domain...")
    os.makedirs(os.path.join(app_dest, "tasks"), exist_ok=True)
    # Tasks models are in projects.py - we'll reference them
    tasks_model_transforms = {
        **common_transforms,
        "from app.models.projects import": "from app.projects.models import",
    }
    
    tasks_files = [
        ("app/routers/tasks.py", "app/tasks/router.py"),
        ("app/helpers/task_ai.py", "app/tasks/ai.py"),
    ]
    for src_rel, dest_rel in tasks_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, tasks_model_transforms)
    
    # Create tasks models.py that imports from projects
    tasks_models_content = '''"""
Task models - imports from projects.models for shared models
"""
from app.projects.models import Task, Comment, RewardLog, task_assignees

__all__ = ["Task", "Comment", "RewardLog", "task_assignees"]
'''
    with open(os.path.join(app_dest, "tasks", "models.py"), 'w') as f:
        f.write(tasks_models_content)
    print(f"  ✓ models.py (proxy)")
    
    # Create tasks schemas.py that imports from projects
    tasks_schemas_content = '''"""
Task schemas - imports from projects.schemas for shared schemas
"""
from app.projects.schemas import (
    TaskCreate, TaskRead, TaskUpdate, TaskWithAssignees,
    CommentCreate, CommentRead, TaskMoveRequest
)

__all__ = [
    "TaskCreate", "TaskRead", "TaskUpdate", "TaskWithAssignees",
    "CommentCreate", "CommentRead", "TaskMoveRequest"
]
'''
    with open(os.path.join(app_dest, "tasks", "schemas.py"), 'w') as f:
        f.write(tasks_schemas_content)
    print(f"  ✓ schemas.py (proxy)")
    
    with open(os.path.join(app_dest, "tasks", "__init__.py"), 'w') as f:
        f.write("# Tasks domain\n")
    
    print("\n[7/11] Creating HIRING domain...")
    os.makedirs(os.path.join(app_dest, "hiring"), exist_ok=True)
    hiring_files = [
        ("app/models/hiring.py", "app/hiring/models.py"),
        ("app/routers/hiring.py", "app/hiring/router.py"),
        ("app/schemas/hiring.py", "app/hiring/schemas.py"),
        ("app/helpers/resume_ai.py", "app/hiring/ai.py"),
    ]
    for src_rel, dest_rel in hiring_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "hiring", "__init__.py"), 'w') as f:
        f.write("# Hiring domain\n")
    
    print("\n[8/11] Creating NOTIFICATIONS domain...")
    os.makedirs(os.path.join(app_dest, "notifications"), exist_ok=True)
    notifications_files = [
        ("app/models/notifications.py", "app/notifications/models.py"),
        ("app/routers/notifications.py", "app/notifications/router.py"),
        ("app/schemas/notification.py", "app/notifications/schemas.py"),
        ("app/helpers/notifications.py", "app/notifications/service.py"),
        ("app/helpers/scheduler.py", "app/notifications/scheduler.py"),
        ("app/websockets/notifications.py", "app/notifications/websocket.py"),
    ]
    for src_rel, dest_rel in notifications_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "notifications", "__init__.py"), 'w') as f:
        f.write("# Notifications domain\n")
    
    print("\n[9/11] Creating MESSAGING domain...")
    os.makedirs(os.path.join(app_dest, "messaging"), exist_ok=True)
    messaging_files = [
        ("app/models/messaging.py", "app/messaging/models.py"),
        ("app/routers/messaging.py", "app/messaging/router.py"),
        ("app/schemas/messaging.py", "app/messaging/schemas.py"),
        ("app/websockets/chat.py", "app/messaging/websocket.py"),
    ]
    for src_rel, dest_rel in messaging_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "messaging", "__init__.py"), 'w') as f:
        f.write("# Messaging domain\n")
    
    print("\n[10/11] Creating AI domain...")
    os.makedirs(os.path.join(app_dest, "ai"), exist_ok=True)
    ai_files = [
        ("app/routers/ai.py", "app/ai/router.py"),
        ("app/helpers/ai.py", "app/ai/service.py"),
        ("app/websockets/ai.py", "app/ai/websocket.py"),
    ]
    for src_rel, dest_rel in ai_files:
        src = os.path.join(SRC_BASE, src_rel)
        dest = os.path.join(DEST_BASE, dest_rel)
        if os.path.exists(src):
            copy_file_with_content_transform(src, dest, common_transforms)
    
    with open(os.path.join(app_dest, "ai", "__init__.py"), 'w') as f:
        f.write("# AI domain\n")
    
    print("\n[11/11] Creating main.py...")
    # Create new main.py with domain imports
    main_content = '''from contextlib import asynccontextmanager

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
'''
    with open(os.path.join(DEST_BASE, "app/main.py"), 'w') as f:
        f.write(main_content)
    print(f"  ✓ main.py")
    
    # Create app __init__.py
    with open(os.path.join(app_dest, "__init__.py"), 'w') as f:
        f.write("# ERP FastAPI Application - Domain-Driven Architecture\n")
    
    print("\n" + "="*70)
    print("  ✅ Domain-driven backend structure created successfully!")
    print("="*70)
    print("\nNext steps:")
    print("  1. Copy .env, requirements.txt, alembic files from backend_by_architecture")
    print("  2. Update any remaining import paths in the code")
    print("  3. Test the application with: python -m uvicorn app.main:app --port 8001")
    print("="*70)

if __name__ == "__main__":
    main()
