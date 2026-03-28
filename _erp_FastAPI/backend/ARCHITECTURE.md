# Domain-Driven Backend Structure - Visual Guide

## 🏗️ Complete Architecture Map

```
backend_by_domain/
│
├── SETUP.bat ⭐ ← RUN THIS FIRST!
├── START_HERE.txt ← Read instructions
├── README.md ← Full documentation
├── build_domain_backend.py ← Setup automation script
│
├── .env ← Environment configuration
├── requirements.txt ← Python dependencies
├── alembic.ini ← Database migrations config
├── create_db.py ← Database initialization
│
├── alembic/ ← Database migrations
│   └── versions/
│
├── media/ ← Uploaded files (avatars, resumes)
│
└── app/ ← Main application
    │
    ├── main.py ⭐ ← FastAPI application entry point
    │
    ├── core/ 🔧 ← SHARED INFRASTRUCTURE
    │   ├── __init__.py
    │   ├── config.py          # Settings & environment variables
    │   ├── database.py        # SQLAlchemy async engine
    │   ├── security.py        # JWT tokens, password hashing
    │   ├── deps.py            # Dependency injection (DB, auth)
    │   └── base.py            # Base ORM model class
    │
    ├── websockets/ 🌐 ← SHARED WEBSOCKET
    │   ├── __init__.py
    │   └── manager.py         # Connection manager (singleton)
    │
    ├── auth/ 🔐 ← AUTHENTICATION DOMAIN
    │   ├── __init__.py
    │   ├── router.py          # /auth/token, /auth/register
    │   └── schemas.py         # Token schemas
    │
    ├── users/ 👤 ← USER MANAGEMENT DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # User, Department, RoleEnum
    │   ├── router.py          # /users/*, /departments/*
    │   └── schemas.py         # UserCreate, UserRead, UserUpdate
    │
    ├── projects/ 📊 ← PROJECT MANAGEMENT DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # Project, ProjectConfig, TaskStatus
    │   │                      # Task, Comment, RewardLog (also here)
    │   ├── router.py          # /projects/*, /projects/{id}/kanban
    │   └── schemas.py         # Project & Task schemas
    │
    ├── tasks/ ✅ ← TASK MANAGEMENT DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # Proxy to projects.models
    │   ├── router.py          # /projects/{id}/tasks/*
    │   ├── schemas.py         # Proxy to projects.schemas
    │   └── ai.py              # AI assignee suggestions
    │
    ├── hiring/ 💼 ← RECRUITMENT DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # JobPosting, Application, Interview
    │   ├── router.py          # /hiring/jobs, /hiring/applications
    │   ├── schemas.py         # Job and Application schemas
    │   └── ai.py              # Resume analysis & scoring
    │
    ├── notifications/ 🔔 ← NOTIFICATIONS DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # Notification
    │   ├── router.py          # /notifications/*
    │   ├── schemas.py         # NotificationRead
    │   ├── service.py         # dispatch_notification()
    │   ├── scheduler.py       # deadline_scheduler() background task
    │   └── websocket.py       # /ws/notifications (real-time push)
    │
    ├── messaging/ 💬 ← CHAT & MESSAGING DOMAIN
    │   ├── __init__.py
    │   ├── models.py          # ChatMessage
    │   ├── router.py          # /chat/project/{id}, /chat/task/{id}
    │   ├── schemas.py         # ChatMessageCreate, ChatMessageRead
    │   └── websocket.py       # /ws/chat/{type}/{id} (real-time chat)
    │
    └── ai/ 🤖 ← AI INTEGRATION DOMAIN
        ├── __init__.py
        ├── router.py          # /ai/chat, /ai/summarize, /ai/status
        ├── service.py         # Ollama LLM integration
        └── websocket.py       # /ws/ai (streaming AI chat)
```

## 🔄 Request Flow Example

### User Creates a Task

```
1. Client → POST /projects/5/tasks/
              ↓
2. tasks/router.py → create_task()
              ↓
3. Validates → tasks/schemas.py (TaskCreate)
              ↓
4. Business Logic → tasks/ai.py (suggest assignees)
              ↓
5. Save to DB → tasks/models.py (Task) via projects/models.py
              ↓
6. Notify Users → notifications/service.py (dispatch_notification)
              ↓
7. WebSocket Push → notifications/websocket.py
              ↓
8. Return Response → tasks/schemas.py (TaskRead)
```

### Real-Time Chat Message

```
1. Client → WS /ws/chat/project/5
              ↓
2. messaging/websocket.py → handle connection
              ↓
3. Uses → websockets/manager.py (ConnectionManager)
              ↓
4. Message Received → validate with messaging/schemas.py
              ↓
5. Save → messaging/models.py (ChatMessage)
              ↓
6. Broadcast → websockets/manager.py.broadcast()
              ↓
7. All connected clients receive message
```

## 📊 Domain Dependencies

```
┌──────────────────────────────────────────────────┐
│              core/ (shared)                      │
│  config, database, security, deps                │
└─────────────────┬────────────────────────────────┘
                  │
        ┌─────────┴─────────────────────────────┐
        │                                       │
┌───────▼─────────┐                  ┌──────────▼───────┐
│   auth/         │                  │  websockets/     │
│   (no deps)     │                  │  (no deps)       │
└─────────────────┘                  └──────────────────┘
        │
┌───────▼─────────┐
│   users/        │
│   (uses: auth)  │
└───────┬─────────┘
        │
        ├──────────────┬──────────────┬──────────────┐
        │              │              │              │
┌───────▼────────┐ ┌───▼────────┐ ┌──▼──────────┐ ┌─▼────────────┐
│  projects/     │ │  hiring/   │ │ messaging/  │ │notifications/│
│  (uses: users) │ │(uses:users)│ │(uses: users)│ │(uses: users) │
└───────┬────────┘ └────────────┘ └─────────────┘ └──────────────┘
        │
┌───────▼────────┐
│    tasks/      │
│ (uses: proj,   │
│       users)   │
└────────────────┘
        │
        ▼
    All domains can use: ai/
```

## 🎯 Key Design Principles

### 1. Self-Contained Domains
Each domain folder contains everything it needs:
- ✅ Models (data structure)
- ✅ Schemas (validation)
- ✅ Router (API endpoints)
- ✅ Service (business logic)
- ✅ WebSocket (real-time, if needed)
- ✅ AI (domain-specific AI, if needed)

### 2. Shared Infrastructure
Core functionality that all domains use:
- 🔧 Configuration
- 🔧 Database connection
- 🔧 Authentication & authorization
- 🔧 Security utilities

### 3. Clear Boundaries
Each domain has a specific responsibility:
- 🔐 auth → User authentication
- 👤 users → User profiles & departments
- 📊 projects → Project management
- ✅ tasks → Task tracking
- 💼 hiring → Recruitment
- 🔔 notifications → Alerts
- 💬 messaging → Chat
- 🤖 ai → AI features

### 4. Dependency Flow
```
Presentation → Domain → Core
(Router)     (Service) (Database)
```

## 🚀 Getting Started

### Step 1: Build the Structure
```batch
cd c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain
SETUP.bat
```

### Step 2: Configure
```batch
# Edit .env file with your settings
notepad .env
```

### Step 3: Install Dependencies
```batch
pip install -r requirements.txt
```

### Step 4: Initialize Database
```batch
python create_db.py
alembic upgrade head
```

### Step 5: Run
```batch
python -m uvicorn app.main:app --port 8001 --reload
```

### Step 6: Test
Open browser: http://localhost:8001/docs

## 💡 Development Tips

### Adding a Feature to Existing Domain
Example: Add avatar upload to users domain
```
1. Add model field → users/models.py
2. Add schema field → users/schemas.py
3. Add endpoint → users/router.py
4. (Optional) Add logic → users/service.py
```

### Creating New Domain
Example: Add inventory domain
```
1. mkdir app/inventory
2. Create files:
   - __init__.py
   - models.py (Product, Stock)
   - router.py (CRUD endpoints)
   - schemas.py (Request/Response)
3. Register in main.py:
   from app.inventory.router import router as inventory_router
   app.include_router(inventory_router, tags=["inventory"])
```

## 📈 Scalability Path

This structure makes it easy to scale:

### Phase 1: Monolith (Current)
All domains in one app

### Phase 2: Separate Services
```
backend_by_domain/ → Multiple services
  ├── auth_service/
  ├── users_service/
  ├── projects_service/
  └── ...
```

### Phase 3: Microservices
Each domain becomes independent microservice

The domain boundaries are already clear! 🎯

---

**Ready to build? Run SETUP.bat now!** 🚀
