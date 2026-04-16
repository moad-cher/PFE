# ERP Backend - Domain-Driven Architecture

This is the domain-driven reorganization of the ERP FastAPI backend, where code is organized by business domains rather than technical layers.

## 🏗️ Architecture Overview

### Domain-Driven Design (DDD)
Each domain is self-contained with its own:
- **Models** - Database ORM definitions
- **Schemas** - Pydantic request/response validation
- **Router** - FastAPI REST endpoints
- **Service** - Business logic and helpers
- **WebSocket** - Real-time communication (where applicable)
- **AI** - Domain-specific AI features (where applicable)

## 📁 Directory Structure

```
backend_by_domain/
├── app/
│   ├── core/                    # Shared Infrastructure
│   │   ├── config.py           # Application settings
│   │   ├── database.py         # SQLAlchemy async engine
│   │   ├── security.py         # JWT & password hashing
│   │   ├── deps.py             # Dependency injection
│   │   └── base.py             # Base ORM model
│   │
│   ├── websockets/              # Shared WebSocket Manager
│   │   └── manager.py          # Connection management
│   │
│   ├── auth/                    # 🔐 Authentication Domain
│   │   ├── router.py           # Login, register, token endpoints
│   │   └── schemas.py          # Token schemas
│   │
│   ├── users/                   # 👤 User Management Domain
│   │   ├── models.py           # User, Department models
│   │   ├── router.py           # User CRUD, stats, departments
│   │   └── schemas.py          # User request/response schemas
│   │
│   ├── projects/                # 📊 Project Management Domain
│   │   ├── models.py           # Project, ProjectConfig, TaskStatus
│   │   ├── router.py           # Project CRUD, team, kanban
│   │   └── schemas.py          # Project schemas
│   │
│   ├── tasks/                   # ✅ Task Management Domain
│   │   ├── models.py           # Task, Comment, RewardLog (proxy)
│   │   ├── router.py           # Task CRUD, assignments, completion
│   │   ├── schemas.py          # Task schemas (proxy)
│   │   └── ai.py               # AI assignee suggestions
│   │
│   ├── hiring/                  # 💼 Recruitment Domain
│   │   ├── models.py           # JobPosting, Application, Interview
│   │   ├── router.py           # Job posts, applications, interviews
│   │   ├── schemas.py          # Hiring schemas
│   │   └── ai.py               # Resume analysis & scoring
│   │
│   ├── notifications/           # 🔔 Notifications Domain
│   │   ├── models.py           # Notification model
│   │   ├── router.py           # Notification endpoints
│   │   ├── schemas.py          # Notification schemas
│   │   ├── service.py          # Notification dispatch logic
│   │   ├── scheduler.py        # Deadline reminder scheduler
│   │   └── websocket.py        # Real-time notification push
│   │
│   ├── messaging/               # 💬 Chat & Messaging Domain
│   │   ├── models.py           # ChatMessage model
│   │   ├── router.py           # Chat history endpoints
│   │   ├── schemas.py          # Message schemas
│   │   └── websocket.py        # Real-time project/task chat
│   │
│   ├── ai/                      # 🤖 AI Integration Domain
│   │   ├── router.py           # AI chat, summarize, describe
│   │   ├── service.py          # Ollama LLM integration
│   │   └── websocket.py        # Streaming AI chat
│   │
│   └── main.py                  # FastAPI application entry point
│
├── alembic/                     # Database migrations
├── media/                       # Uploaded files (avatars, resumes)
├── .env                         # Environment variables
├── requirements.txt             # Python dependencies
├── create_db.py                 # Database initialization
├── alembic.ini                  # Alembic configuration
└── SETUP.bat                    # Setup script

```
### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Edit `.env` file with your settings:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/erp_db
SECRET_KEY=your-secret-key-here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
```

### 5. Run Migrations
```bash
alembic upgrade head
```

### 6. Start the Server
```bash
python -m uvicorn app.main:app --port 8001 --reload
```

API will be available at: `http://localhost:8001`
API Documentation: `http://localhost:8001/docs`

## 📚 Domain Overview

### 🔐 **Authentication** (`/auth`)
- User login with JWT tokens
- User registration
- Token validation
- Role-based access control (admin, hr_manager, project_manager, team_member)

### 👤 **Users** (`/users`)
- User profiles with skills, avatars, reward points
- Department management
- User statistics (projects, tasks)
- Password management

### 📊 **Projects** (`/projects`)
- Project CRUD operations
- Team member management
- Custom task statuses with colors
- Kanban board views
- Project configuration (rewards, notifications)
- Dashboard analytics

### ✅ **Tasks** (`/tasks`)
- Task CRUD with priorities
- Multi-user task assignments
- Task status workflow
- Deadline tracking with time slots
- Reward points system
- Task comments
- AI-powered assignee suggestions

### 💼 **Hiring** (`/hiring`)
- Job posting management (CDI, CDD, Stage, Freelance)
- Application tracking
- Resume upload and analysis
- AI-powered resume scoring
- Interview scheduling
- Recruitment analytics

### 🔔 **Notifications** (`/notifications`)
- Multiple notification types (task, deadline, application, reward)
- Real-time WebSocket push
- Unread count tracking
- Background deadline scheduler
- Mark as read functionality

### 💬 **Messaging** (`/chat`)
- Project-level chat rooms
- Task-level discussions
- Message history
- Real-time WebSocket chat
- User presence tracking

### 🤖 **AI Integration** (`/ai`)
- Ollama LLM integration
- Multi-turn conversations
- Text summarization
- Description generation
- Resume analysis
- Task assignee suggestions
- Streaming responses

## 🔄 Differences from `backend_by_architecture`

| Aspect | Architecture-Based | Domain-Based |
|--------|-------------------|--------------|
| **Organization** | By technical layer (routers/, models/) | By business domain (users/, projects/) |
| **File Location** | `app/models/accounts.py` | `app/users/models.py` |
| **Imports** | `from app.models.accounts import User` | `from app.users.models import User` |
| **Cohesion** | Related code scattered | Related code together |
| **Navigation** | Jump between folders | Stay in domain folder |

## 🛠️ Development

### Adding a New Feature to a Domain
1. Navigate to the domain folder (e.g., `app/users/`)
2. Add models to `models.py`
3. Add schemas to `schemas.py`
4. Add endpoints to `router.py`
5. Add business logic to `service.py`

### Creating a New Domain
1. Create folder: `app/new_domain/`
2. Add required files: `models.py`, `router.py`, `schemas.py`, `__init__.py`
3. Register router in `app/main.py`:
   ```python
   from app.new_domain.router import router as new_domain_router
   app.include_router(new_domain_router, tags=["new_domain"])
   ```

## 📊 API Endpoints by Domain

### Authentication
- `POST /auth/token` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Current user

### Users
- `GET /users/` - List users
- `GET /users/me` - Current user profile
- `GET /users/me/stats` - User statistics
- `GET /users/{id}` - User details
- `GET /departments/` - List departments

### Projects
- `GET /projects/` - List projects
- `POST /projects/` - Create project
- `GET /projects/dashboard` - Analytics
- `GET /projects/{id}` - Project details
- `PUT /projects/{id}/members` - Manage team
- `GET /projects/{id}/kanban` - Kanban board

### Tasks
- `GET /projects/{id}/tasks/` - List tasks
- `POST /projects/{id}/tasks/` - Create task
- `PUT /tasks/{id}` - Update task
- `POST /tasks/{id}/assign` - Assign users
- `POST /tasks/{id}/complete` - Complete task
- `GET /tasks/{id}/comments` - Task comments

### Hiring
- `GET /hiring/jobs` - List job postings
- `POST /hiring/jobs` - Create job
- `GET /hiring/applications` - List applications
- `POST /hiring/applications/{id}/interviews` - Schedule interview
- `GET /hiring/stats` - Recruitment stats

### Notifications
- `GET /notifications/` - List notifications
- `GET /notifications/unread-count` - Unread count
- `PUT /notifications/mark-all-read` - Mark all read

### Messaging
- `GET /chat/project/{id}` - Project chat history
- `GET /chat/task/{id}` - Task chat history
- `WS /ws/chat/{type}/{id}` - Real-time chat

### AI
- `GET /ai/status` - Check Ollama status
- `POST /ai/chat` - AI conversation
- `POST /ai/summarize` - Text summarization
- `WS /ws/ai` - Streaming AI chat

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `ALGORITHM` - JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 60)
- `MEDIA_DIR` - Upload directory (default: media)
- `OLLAMA_BASE_URL` - Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - LLM model

**Built with FastAPI, SQLAlchemy, PostgreSQL, and Ollama** 🚀
