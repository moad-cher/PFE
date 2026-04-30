# ERP FastAPI - Technical Cheat Sheet

Last verified: 2026-04-30
Scope: _ERP_/backend + _ERP_/frontend

## Stack
| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Backend    | FastAPI + SQLAlchemy async + Alembic                     |
| DB         | PostgreSQL-compatible URL (typically asyncpg in .env)    |
| Auth       | JWT (python-jose), OAuth2PasswordBearer                  |
| Frontend   | React + Vite + Tailwind + Axios + Recharts + @hello-pangea/dnd |
| AI         | Ollama via HTTP (httpx)                                  |
| Real-time  | Native FastAPI WebSockets + shared WS connection manager |
| Background | asyncio lifespan workers + FastAPI BackgroundTasks       |

## Actual Backend Structure
This backend is domain-driven, not layer-driven.

```
backend/
  app/main.py                        # App entry, CORS, router mounting, lifespan workers
  app/core/                          # Shared infra (config, DB, security, deps)
    config.py
    database.py
    deps.py
    security.py
  app/websockets/manager.py          # Shared room/user connection manager + heartbeat
  app/websockets/auth.py             # Centralized JWT extraction & user validation
  app/auth/                          # Login/register/me/refresh
  app/users/                         # Users, departments (bulk management via Ctrl/Shift), profile
  app/projects/                      # Projects, Stories, Sprints, statuses, config, members, leaderboard
  app/tasks/                         # Task CRUD, comments, assignment workflow, AI suggestion hook
  app/hiring/                        # Jobs, applications, interviews, resume AI analysis
  app/notifications/                 # Notification CRUD, scheduler, WS push
  app/messaging/                     # Chat REST + project/task chat WS
  app/ai/                            # Generic AI routes + streaming WS
  alembic/versions/                  # Migrations
```

## Running
From workspace root:
- _ERP_/run_project.bat

What it does:
- Starts backend on http://127.0.0.1:8001
- Starts frontend on http://localhost:5173

## Feature Areas
### Auth and Access Control
- Backend uses OAuth2PasswordBearer token extraction and JWT access/refresh tokens.
- get_current_user validates token type="access", resolves user from DB, and enforces active users.
- require_roles(*roles) dependency is used for declarative access control on restricted endpoints.
- Frontend `<Guard>` component and `usePermissions` hook provide centralized UI and logic protection.
- Frontend ProtectedRoute blocks anonymous users and role-mismatched routes.
- Navbar and route visibility adapt to role via Guard components.

- **Permission utilities** (`auth/permissions.js`): `hasRole()`, `canManageHiring()`, `canManageProjects()`, `isProjectManager()`, `canEditTask()`.
- **Guard component** (`auth/Guard.jsx`): Reusable wrapper for conditional rendering. Props: `role`, `roles`, `canManageHiring`, `canManageProjects`, `isProjectManager`, `canEditTask`.
- **usePermissions hook**: Programmatic access to permission checks.
- **Related auth UI paths**:
  - `auth/ProtectedRoute.jsx`
  - `components/shared/layout/Navbar.jsx` (consumes Guard)

### Frontend Component Layout
- Shared UI primitives live in `components/shared/ui/` (e.g., `Spinner.jsx`, `PdfViewer.jsx`, `StatusBadge.jsx`).
- Dashboard specific components (cards, charts) live in `pages/dashboards/cards/` (e.g., `StatCard.jsx`, `DashboardChartRegistry.jsx`).
- Domain components live in `components/features/<domain>/`:
  - `components/features/chat/ChatWindow.jsx`
  - `components/features/hiring/CreateJobModal.jsx`
  - `components/features/hiring/EditJobModal.jsx`
  - `auth/Guard.jsx`

### Common Import Targets
- Use these canonical imports in pages/components:
  - `Spinner` -> `components/shared/ui/Spinner.jsx`
  - `StatCard` -> `pages/dashboards/cards/StatCard.jsx`
  - `DashboardChart` -> `pages/dashboards/cards/DashboardChartRegistry.jsx`
  - `ChatWindow` -> `components/features/chat/ChatWindow.jsx`
  - `Guard` / `usePermissions` -> `auth/Guard.jsx`
  - `CreateJobModal` -> `components/features/hiring/CreateJobModal.jsx`
  - `EditJobModal` -> `components/features/hiring/EditJobModal.jsx`
- Legacy paths like `components/Spinner`, `components/Guard`, `components/ChatWindow`, `components/CreateJobModal`, and `components/EditJobModal` should be treated as stale.

### Real-time and Notifications
- Shared WS manager supports room grouping, per-user fan-out (user_<id>), presence, and dead-socket pruning.
- **Standardized WS Auth**: Authentication is centralized in `app/websockets/auth.py`.
  - **Strict Requirement**: Handshake extracts JWT **only** from the query string (`?token=...`). 
  - **No Fallbacks**: Headers and subprotocols are no longer supported for authentication to maintain a singular, clean transport pattern.
  - **Unified**: All modules (Notifications, Chat, AI Stream) now follow this high-maintainability pattern.
- Notification writes are persisted to DB first, then pushed live.
- Notification dropdown loads initial REST data and merges incoming WS events.
- mark-all-read is implemented with one SQL UPDATE query.
- Frontend WS clients stop auto-reconnect loops on explicit auth/policy close codes (1008 / 4001).

### Projects, Tasks, and Collaboration
- Projects domain includes: dashboard, CRUD, config, task statuses, kanban, scrum roadmap view, member management.
- **Project names are unique** (enforced via DB constraint and API validation).
- **Scrum + Story-centric UX**: Sprints contain Stories, which in turn act as containers for Tasks.
- **Multiple Scrum Views**:
  - `ScrumBoard` (v1): Sprint timeline view.
  - `ScrumBoard2` (v2): Grid/lane view.
  - `ScrumBoard3` (v3 ✨): Modern sidebar-based workspace with persistent sprint tree navigation.
- **Decoupled Sprints**: Tasks no longer have a direct `sprint_id`. They inherit their sprint context solely from their parent Story.
- **Draggable Stories**: Stories (and their tasks) can be dragged between the Backlog and Sprints.
  - **Integrity**: Dragging to or from `completed` sprints is disabled to preserve history.
- **Sprint Planning Trigger Rule**: "Plan Next Sprint" is rendered once at the bottom of the sprint timeline and is hidden when the last sprint is already `draft`.
- **Sprint Completion Flow**: Completing an active sprint moves unfinished stories to the next sprint if present, otherwise to Backlog (`sprint_id = null`).
- **Story Creation Flow**: New stories created from modal are created in Backlog first (`sprint_id = null`).
- **Completed Sprint Guardrails**: API rejects creating or moving stories into a `completed` sprint.
- **Bulk User Management**: Department modal supports multi-selection (Ctrl/Shift click) and bulk drag-and-drop.
- Project member stats and leaderboard use grouped DB queries (not per-user N+1 loops).
- Messaging supports project and task chat via REST history + WS live events.
- AI suggest assignee after clicking "Suggest Assignees"

### Hiring and AI Workflow
- Hiring includes jobs, applications, interviews, and HR stats.
- Application submission accepts resume upload and schedules async analysis.
- Resume analysis runs in background, extracts text off the event loop (asyncio.to_thread), and writes ai_score/ai_analysis.
- HR/admin share protected hiring management routes.
- Generic AI module exposes chat, summarize, generate-description, and WS streaming endpoints.

### Analytics and Dashboards
- Analytics endpoints are split by audience:
  - /analytics/admin/activity-trend
  - /analytics/hr/pipeline
  - /analytics/project/{id}/overview
  - /analytics/project-manager/overview
  - /analytics/team-member/performance
- Frontend Dashboard routes by role to AdminDashboard, HRDashboard, ProjectManagerDashboard, TeamMemberDashboard.
- **Centralized Charting**: `DashboardChartRegistry.jsx` provides a DRY API for `BAR`, `PIE`, `LINE`, `AREA`, `DONUT`, and `FUNNEL` charts with global consistency for tooltips and themes.
- **Unified Stats**: `StatCard.jsx` handles numeric summaries with icons, status colors, and trend indicators across all dashboards.

### App Shell and State
- App wraps BrowserRouter with AuthProvider + RealTimeProvider.
- Public and protected layouts are separated; Navbar behavior differs by auth state.
- RealTimeContext owns the notification WS connection and distributes events to subscribers.
- Project routes include multiple scrum variants:
  - `/projects/:pk/scrum`
  - `/projects/:pk/scrum2`
  - `/projects/:pk/scrum3` (v3 ✨)

## Key API/WS Endpoints

Auth:
- POST /auth/token
- POST /auth/refresh
- POST /auth/register
- GET /auth/me

Notifications:
- GET /notifications/
- POST /notifications/mark-all-read
- PATCH /notifications/{notif_id}/read
- DELETE /notifications/{notif_id}
- GET /notifications/unread-count
- WS /ws/notifications?token=[token]

Stories:
- GET /projects/{pk}/stories
- POST /projects/{pk}/stories
- PATCH /projects/{pk}/stories/{story_id}
- DELETE /projects/{pk}/stories/{story_id}

Sprints:
- GET /projects/{pk}/sprints
- POST /projects/{pk}/sprints
- PATCH /projects/{pk}/sprints/{sprint_id}
- DELETE /projects/{pk}/sprints/{sprint_id}
- GET /projects/{pk}/scrum (supports `status`, `assignee_id`, and `sprint_id` filters)

Messaging:
- GET /chat/project/{pk}
- GET /chat/task/{pk}
- WS /ws/chat/{room_type}/{pk}?token=[token]

AI:
- GET /ai/status
- POST /ai/chat
- POST /ai/summarize
- POST /ai/generate-description
- WS /ws/ai/stream?token=[token]

## Tests Present
Backend tests currently in backend/tests:
- _api_test.py
- ai_contract_test.py
- smoke_test.py
- ws_smoke_test.py
