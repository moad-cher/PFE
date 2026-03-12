# Backend Architecture Comparison: FastAPI vs Django

## ERP System — Module Recrutement & Gestion de Projets

> **Project Constraints (updated):**
> - Frontend: JS Framework (React / Vue) — no server-side templates
> - No auto API docs required
> - Single startup deployment
> - Interactive AI with tool-calling + streaming responses
> - Real-time: WebSocket notifications + live chat
> - Must run smoothly — no friction, no unexpected bugs
> - Beginner-friendly, explicit syntax that teaches transferable skills
> - Not opinionated — freedom to structure the code

---

## 1. High-Level Architecture Overview

### Django + DRF (API Backend for JS Frontend)

```mermaid
graph TD
    JS["⚛️ JS Frontend<br>(React / Vue)"]
    DRF["Django REST Framework<br>(API Views / Serializers)"]
    DJANGO["Django Core<br>(Gunicorn — WSGI sync)"]
    AUTH["django.contrib.auth<br>+ SimpleJWT"]
    ORM["Django ORM<br>(QuerySet — sync blocking)"]
    ADMIN["Django Admin<br>✅ Free HR dashboard"]
    CELERY["Celery Worker<br>⚠️ Required for any async task"]
    CHANNELS["Django Channels<br>⚠️ Bolt-on ASGI layer"]
    AI_TOOL["AI Agent<br>⚠️ Blocking unless offloaded to Celery"]
    DB[("PostgreSQL")]
    REDIS[("Redis<br>(Broker + Channel Layer)")]
    MEDIA["Media Storage<br>(CVs / Avatars)"]  

    JS -->|REST JSON| DRF
    JS -->|WebSocket| CHANNELS
    DRF --> DJANGO
    DJANGO --> AUTH
    DJANGO --> ORM
    ORM -->|sync blocking| DB
    DJANGO --> ADMIN
    CHANNELS -->|requires| REDIS
    DJANGO -->|offload async| CELERY
    CELERY --> AI_TOOL
    CELERY --> REDIS
    CELERY --> DB
    DJANGO --> MEDIA

    style DJANGO fill:#092E20,color:#fff,stroke:#44B78B
    style DRF fill:#44B78B,color:#fff
    style ORM fill:#44B78B,color:#fff
    style ADMIN fill:#44B78B,color:#fff
    style AUTH fill:#44B78B,color:#fff
    style DB fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
    style CELERY fill:#c0392b,color:#fff
    style CHANNELS fill:#c0392b,color:#fff
    style AI_TOOL fill:#c0392b,color:#fff
```

> ⚠️ **With a JS frontend, Django's template engine is unused.** DRF adds boilerplate and CHANNELS is a complex bolt-on — the original monolith advantage erodes.

### FastAPI (Async API + Native WebSocket + AI Agents)

```mermaid
graph TD
    JS["⚛️ JS Frontend<br>(React / Vue)"]
    API["FastAPI Router<br>(ASGI — async native)"]
    AUTH["JWT Middleware<br>✅ OAuth2 built-in"]
    WS["WebSocket Manager<br>✅ Native — no addon needed"]
    CHAT["Chat Handler<br>✅ async broadcast"]
    NOTIF["Notification Manager<br>✅ async push"]
    AI_AGENT["LangChain Agent<br>✅ Tool-calling (async)"]
    TOOLS["Agent Tools<br>• search_candidates()<br>• assign_task()<br>• check_deadline()"]
    ORM["SQLAlchemy (async)<br>+ Alembic migrations"]
    DB[("PostgreSQL")]
    MONGO[("MongoDB<br>(CVs / Chat history)")]
    REDIS[("Redis<br>(Pub/Sub for WS broadcast)")]

    JS -->|REST JSON| API
    JS -->|WebSocket| WS
    API --> AUTH
    API --> ORM
    API --> AI_AGENT
    WS --> CHAT
    WS --> NOTIF
    CHAT --> REDIS
    NOTIF --> REDIS
    AI_AGENT --> TOOLS
    TOOLS --> ORM
    TOOLS --> MONGO
    ORM -->|async| DB
    AI_AGENT --> MONGO

    style API fill:#009688,color:#fff
    style AUTH fill:#1565C0,color:#fff
    style WS fill:#009688,color:#fff
    style CHAT fill:#009688,color:#fff
    style NOTIF fill:#009688,color:#fff
    style AI_AGENT fill:#7B1FA2,color:#fff
    style TOOLS fill:#7B1FA2,color:#fff
    style ORM fill:#FF8F00,color:#fff
    style DB fill:#336791,color:#fff
    style MONGO fill:#4DB33D,color:#fff
    style REDIS fill:#DC382D,color:#fff
```

> ✅ **With a JS frontend**, FastAPI acts as a pure async API + WebSocket server. No templates, no Celery needed for AI tasks — everything runs in the same async event loop.

---

## 2. Real-Time Chat & Notification Flow

This is where the architectural gap is most visible for this project.

### Django (Channels — bolt-on complexity)

```mermaid
sequenceDiagram
    participant U1 as User A (JS)
    participant U2 as User B (JS)
    participant CH as Django Channels (ASGI)
    participant RL as Channel Layer (Redis)
    participant DB as PostgreSQL
    participant CEL as Celery Worker

    U1->>CH: WS connect /ws/chat/room1/
    CH->>RL: group_add(room1, U1)
    U1->>CH: send message
    CH->>DB: save message (sync ORM ⚠️)
    CH->>RL: group_send(room1, msg)
    RL-->>CH: deliver to U2
    CH-->>U2: WS message

    Note over CEL: Notifications require separate Celery task
    CH->>CEL: trigger notification task
    CEL->>DB: write notification
    CEL-->>U2: (delayed) email/push
```

### FastAPI (Native async WebSocket)

```mermaid
sequenceDiagram
    participant U1 as User A (JS)
    participant U2 as User B (JS)
    participant WM as WS Manager (FastAPI)
    participant REDIS as Redis Pub/Sub
    participant DB as PostgreSQL (async)

    U1->>WM: WS connect /ws/chat/room1
    WM->>REDIS: subscribe(room1)
    U1->>WM: send message
    WM->>DB: await save_message() ✅ non-blocking
    WM->>REDIS: publish(room1, msg)
    REDIS-->>WM: broadcast
    WM-->>U2: WS message ✅

    Note over WM: Same event loop handles notifications
    WM->>WM: await notify_user(U2) ✅ no Celery needed
```

---

## 3. Interactive AI Agent Flow (Tool-Calling)

The project requires an AI that can call internal functions — e.g. fetching candidate scores, assigning tasks, querying deadlines.

### Django (Celery-based — indirect)

```mermaid
sequenceDiagram
    participant U as HR Manager (JS)
    participant API as DRF View (sync)
    participant CEL as Celery Worker
    participant AI as LangChain Agent
    participant DB as PostgreSQL

    U->>API: POST /ai/suggest-assignment/
    API->>CEL: queue task (async offload ⚠️)
    Note over CEL: Different process — no shared state
    CEL->>AI: run agent
    AI->>AI: tool_call: get_member_skills()
    AI->>DB: query (via ORM in worker)
    DB-->>AI: result
    AI->>AI: tool_call: get_workload()
    AI->>DB: query
    DB-->>AI: result
    AI-->>CEL: suggestion JSON
    CEL->>DB: store result
    Note over U: User must poll or use separate WS ⚠️
    U->>API: GET /ai/result/{task_id}/
    API-->>U: suggestion
```

### FastAPI (Native async — streaming capable)

```mermaid
sequenceDiagram
    participant U as HR Manager (JS)
    participant API as FastAPI Route (async)
    participant AI as LangChain Agent (async)
    participant DB as PostgreSQL (async)
    participant WS as WebSocket (same loop)

    U->>API: POST /ai/suggest-assignment/
    API->>AI: await agent.arun() ✅
    AI->>AI: tool_call: get_member_skills()
    AI->>DB: await db.fetch() ✅ non-blocking
    DB-->>AI: result
    AI->>AI: tool_call: get_workload()
    AI->>DB: await db.fetch() ✅
    DB-->>AI: result
    AI-->>API: suggestion (streaming tokens)
    API-->>U: StreamingResponse ✅

    Note over WS: OR push result via WebSocket
    API->>WS: await ws.send_json(suggestion) ✅
```

---

## 4. Feature Matrix (Given Project Constraints)

```mermaid
mindmap
  root((ERP Backend<br>JS Frontend + AI + Real-time))
    Django
      ✅ Built-in Admin Panel
      ✅ ORM + Migrations
      ✅ Auth system
      ⚠️ Channels needed for WebSocket
      ⚠️ Celery needed for async AI
      ⚠️ Celery needed for notifications
      ❌ Sync by default — blocks on AI calls
      ❌ Templates unused with JS frontend
      ❌ No streaming AI responses
      ❌ Forms unused with JS frontend
      ❌ 3 extra services: DRF + Channels + Celery
    FastAPI
      ✅ Native async — no Celery needed
      ✅ Native WebSocket — no addon
      ✅ LangChain async agents natively
      ✅ StreamingResponse for AI output
      ✅ JWT / OAuth2 built-in
      ✅ Pydantic type-safe validation
      ✅ One server handles REST + WS + AI
      ⚠️ No built-in Admin UI
      ⚠️ SQLAlchemy async setup overhead
      ⚠️ Alembic migrations vs Django migrations
```

---

## 5. ERP Module Fit Analysis

### Hiring Module

```mermaid
graph LR
    subgraph Django["Django — Hiring Module (JS frontend)"]
        D_FORM["Forms<br>❌ Unused — JS handles forms"]
        D_CV["Media Storage<br>✅ FileField built-in"]
        D_ADMIN["Django Admin<br>✅ HR dashboard free"]
        D_AI["CV Analysis AI<br>❌ Blocks WSGI thread<br>⚠️ Must offload to Celery"]
        D_AUTH["Auth<br>⚠️ Session-based, JWT via addon"]
        D_STREAM["AI Streaming<br>❌ Not supported natively"]
    end

    subgraph FastAPI["FastAPI — Hiring Module (JS frontend)"]
        F_FORM["Pydantic Models<br>✅ Clean JSON validation"]
        F_CV["Async Upload<br>✅ Non-blocking file I/O"]
        F_ADMIN["Admin UI<br>❌ Must build or use SQLAdmin"]
        F_AI["CV Analysis AI<br>✅ await agent.arun()<br>✅ StreamingResponse"]
        F_AUTH["Auth<br>✅ JWT / OAuth2 native"]
        F_STREAM["AI Streaming<br>✅ Token-by-token streaming"]
    end

    style Django fill:#092E20,color:#fff
    style FastAPI fill:#009688,color:#fff
```

### Projects Module

```mermaid
graph LR
    subgraph Django["Django — Projects Module"]
        D_WS["Real-time Chat<br>❌ Channels + Redis<br>+ separate ASGI config"]
        D_NOTIF["Live Notifications<br>❌ Channels + Celery<br>= 2 extra services"]
        D_KANBAN["Kanban REST API<br>✅ DRF ViewSets"]
        D_PERM["Permissions<br>✅ Built-in groups"]
        D_REWARD["Rewards<br>✅ Signals + ORM"]
        D_AI["Task Assignment AI<br>❌ Celery required<br>No streaming"]
    end

    subgraph FastAPI["FastAPI — Projects Module"]
        F_WS["Real-time Chat<br>✅ Native WebSocket<br>+ Redis Pub/Sub"]
        F_NOTIF["Live Notifications<br>✅ async push<br>Same event loop"]
        F_KANBAN["Kanban REST API<br>✅ Router + Pydantic"]
        F_PERM["Permissions<br>⚠️ Dependency injection<br>(more explicit)"]
        F_REWARD["Rewards<br>✅ Async event-driven"]
        F_AI["Task Assignment AI<br>✅ await agent.arun()<br>✅ Stream to WS"]
    end

    style Django fill:#092E20,color:#fff
    style FastAPI fill:#009688,color:#fff
```

---

## 6. Concurrency Model — The Core Difference

```mermaid
graph TD
    subgraph WSGI["Django WSGI — Sync Workers"]
        W1["Worker 1<br>⏳ waiting for DB"]
        W2["Worker 2<br>⏳ waiting for AI"]
        W3["Worker 3<br>⏳ waiting for file"]
        W4["Worker 4<br>✅ processing"]
        NOTE1["❌ 3 threads blocked<br>New requests queue up"]
        W1 --- NOTE1
        W2 --- NOTE1
        W3 --- NOTE1
    end

    subgraph ASGI["FastAPI ASGI — Single Async Event Loop"]
        EL["Event Loop"]
        T1["await DB query"]
        T2["await AI agent"]
        T3["await file upload"]
        T4["await WS message"]
        EL --> T1
        EL --> T2
        EL --> T3
        EL --> T4
        NOTE2["✅ All run concurrently<br>No blocking"]
        T1 --- NOTE2
        T2 --- NOTE2
        T3 --- NOTE2
        T4 --- NOTE2
    end

    style WSGI fill:#c0392b,color:#fff
    style ASGI fill:#27ae60,color:#fff
    style EL fill:#009688,color:#fff
```

> For an app with simultaneous **AI calls + WebSocket chat + file uploads**, a sync WSGI server exhausts its thread pool quickly. ASGI handles all concurrently in one process.

---

## 7. Infrastructure Complexity Comparison

How many services does each stack need to deliver all features?

```mermaid
graph TD
    subgraph DjangoStack["Django Stack — Services Required"]
        DS1["Django (WSGI/ASGI)<br>— REST API"]
        DS2["Django Channels<br>— WebSocket / Chat"]
        DS3["Celery Workers<br>— Async AI tasks"]
        DS4["Celery Beat<br>— Scheduled tasks"]
        DS5["Redis<br>— Channel layer + Broker"]
        DS6["PostgreSQL"]
        DS7["JS Frontend<br>(React/Vue)"]
        DS1 --- DS2
        DS2 --- DS5
        DS1 --- DS3
        DS3 --- DS5
        DS3 --- DS4
        DS1 --- DS6
        DS7 --- DS1
        DS7 --- DS2
        COUNT_D["📦 6 services to configure & maintain"]
    end

    subgraph FastAPIStack["FastAPI Stack — Services Required"]
        FS1["FastAPI (ASGI)<br>— REST + WebSocket + AI"]
        FS2["Redis<br>— Pub/Sub for WS broadcast"]
        FS3["PostgreSQL"]
        FS4["MongoDB (optional)<br>— CV / chat history"]
        FS5["JS Frontend<br>(React/Vue)"]
        FS1 --- FS2
        FS1 --- FS3
        FS1 --- FS4
        FS5 --- FS1
        COUNT_F["📦 3-4 services — leaner stack"]
    end

    style DjangoStack fill:#2c3e50,color:#fff
    style FastAPIStack fill:#1a5276,color:#fff
    style COUNT_D fill:#c0392b,color:#fff
    style COUNT_F fill:#27ae60,color:#fff
```

---

## 8. Developer Experience — Magic vs Explicit

This is the criterion that matters most for "smooth running + no unexpected bugs + beginner-friendly".

### Django: Implicit Magic (opinionated, hidden wiring)

```mermaid
graph TD
    CODE["You write a Model class"]
    MAGIC1["Django auto-creates DB table<br>via Meta class magic"]
    MAGIC2["Signals fire on save()<br>— not visible in your code"]
    MAGIC3["Middleware modifies request<br>— not in view signature"]
    MAGIC4["Related objects lazily loaded<br>— N+1 bug if you forget select_related()"]
    MAGIC5["ORM querysets are lazy<br>— evaluated at unpredictable times"]
    MAGIC6["Celery task serialization<br>— silent failures if object not JSON-serializable"]

    CODE --> MAGIC1 --> MAGIC2 --> MAGIC3
    MAGIC1 --> MAGIC4
    MAGIC4 --> MAGIC5
    MAGIC2 --> MAGIC6

    style CODE fill:#092E20,color:#fff
    style MAGIC1 fill:#e67e22,color:#fff
    style MAGIC2 fill:#c0392b,color:#fff
    style MAGIC3 fill:#c0392b,color:#fff
    style MAGIC4 fill:#c0392b,color:#fff
    style MAGIC5 fill:#c0392b,color:#fff
    style MAGIC6 fill:#c0392b,color:#fff
```

### FastAPI: Explicit Everything (non-opinionated, what-you-see-is-what-you-get)

```mermaid
graph TD
    ROUTE["@app.post('/apply')<br>async def apply(data: ApplicationForm, db: AsyncSession = Depends(get_db))"]
    EXPL1["Type hint = validation + docs<br>✅ No hidden magic"]
    EXPL2["Depends() = explicit dependency<br>✅ Visible in function signature"]
    EXPL3["async def = explicit async<br>✅ You know it's non-blocking"]
    EXPL4["await db.execute()<br>✅ No lazy evaluation surprise"]
    EXPL5["Pydantic model = explicit schema<br>✅ Input validated before function runs"]

    ROUTE --> EXPL1
    ROUTE --> EXPL2
    ROUTE --> EXPL3
    EXPL3 --> EXPL4
    EXPL1 --> EXPL5

    style ROUTE fill:#009688,color:#fff
    style EXPL1 fill:#27ae60,color:#fff
    style EXPL2 fill:#27ae60,color:#fff
    style EXPL3 fill:#27ae60,color:#fff
    style EXPL4 fill:#27ae60,color:#fff
    style EXPL5 fill:#27ae60,color:#fff
```

---

## 9. Common Foot-guns & Unexpected Bugs

### Django foot-guns in this project's context

```mermaid
flowchart TD
    BUG1["🐛 N+1 Query Bug<br>for task in tasks: task.assigned_to.name<br>→ 1 query per task, silent in dev"]
    BUG2["🐛 Sync View + AI Call<br>view calls requests.post(AI_API)<br>→ blocks entire WSGI worker thread"]
    BUG3["🐛 Channels + Celery race<br>Celery fires notification before<br>Channels consumer is connected"]
    BUG4["🐛 Signal side-effects<br>post_save signal triggers email<br>→ fires during test, fixtures, admin actions"]
    BUG5["🐛 Lazy queryset in Channels<br>pass queryset to async consumer<br>→ SynchronousOnlyOperation exception"]
    BUG6["🐛 Session vs JWT mismatch<br>DRF defaults to session auth<br>→ JS client gets 403 unexpectedly"]

    style BUG1 fill:#c0392b,color:#fff
    style BUG2 fill:#c0392b,color:#fff
    style BUG3 fill:#c0392b,color:#fff
    style BUG4 fill:#c0392b,color:#fff
    style BUG5 fill:#c0392b,color:#fff
    style BUG6 fill:#c0392b,color:#fff
```

### FastAPI foot-guns (fewer, more visible)

```mermaid
flowchart TD
    BUG1["⚠️ Blocking call in async route<br>time.sleep() or requests.get() in async def<br>→ blocks event loop<br>✅ Fix: use asyncio.sleep() / httpx.AsyncClient"]
    BUG2["⚠️ Missing await<br>db.execute() without await<br>→ coroutine never runs, silent<br>✅ Fix: type checker catches it"]
    BUG3["⚠️ SQLAlchemy session scope<br>wrong session lifecycle in async<br>→ DetachedInstanceError<br>✅ Fix: always use Depends(get_db)"]

    NOTE["✅ These bugs are:<br>• Visible (type hints flag them)<br>• Consistent (same async rules everywhere)<br>• Teachable (standard Python async)"]

    BUG1 --> NOTE
    BUG2 --> NOTE
    BUG3 --> NOTE

    style BUG1 fill:#e67e22,color:#fff
    style BUG2 fill:#e67e22,color:#fff
    style BUG3 fill:#e67e22,color:#fff
    style NOTE fill:#27ae60,color:#fff
```

---

## 10. What Each Framework Teaches You

```mermaid
mindmap
  root((Skills Learned))
    Django
      Django-specific
        Django ORM (non-transferable)
        Django signals (non-transferable)
        Django admin patterns
        DRF serializers
      Transferable
        SQL concepts via ORM
        MVC / MVT pattern
        Middleware concept
    FastAPI
      Fully transferable
        async / await (Python standard)
        Type hints (Python 3.10+ standard)
        Pydantic (used across Python ecosystem)
        Dependency Injection (universal pattern)
        SQLAlchemy (used outside FastAPI)
        JWT / OAuth2 (protocol, not framework)
        WebSocket protocol
        LangChain async patterns
```

> FastAPI forces you to learn Python itself (type hints, async) and universal patterns (DI, JWT, WebSocket) — not framework-specific magic.

---

## 11. Architectural Decision — This Project

```mermaid
flowchart TD
    START([🏁 Choose Backend Architecture]) --> Q1{Server-side<br>HTML templates needed?}
    Q1 -->|Yes| DJANGO_FULL["✅ Django Full-stack<br>(templates + admin)"]
    Q1 -->|No — JS Frontend| Q2

    Q2{Want explicit syntax<br>no hidden magic?} -->|Yes| Q3
    Q2 -->|No, prefer convention| DJANGO_DRF["Django + DRF"]

    Q3{Real-time chat +<br>notifications needed?} -->|Yes| Q4
    Q3 -->|No| Q5

    Q4{Prefer 1 server<br>vs 3 extra services?} -->|1 server| FASTAPI_WIN
    Q4 -->|OK with complexity| HYBRID["⚙️ Django + DRF<br>+ Channels + Celery"]

    Q5{AI tool-calling<br>+ streaming?} -->|Yes| FASTAPI_WIN["✅ FastAPI"]
    Q5 -->|No| DJANGO_DRF

    FASTAPI_WIN --> VERDICT["✅ CHOSEN: FastAPI<br>• Explicit async/await — no hidden behavior<br>• Type hints catch bugs before runtime<br>• Native WebSocket — no extra service<br>• await agent.arun() — no Celery<br>• Teaches transferable Python skills<br>• You structure code your way"]

    HYBRID --> ALT["🔄 Only if Django Admin<br>is non-negotiable"]

    style VERDICT fill:#009688,color:#fff,stroke:#004D40
    style ALT fill:#FF8F00,color:#fff
    style HYBRID fill:#c0392b,color:#fff
    style FASTAPI_WIN fill:#009688,color:#fff
    style DJANGO_FULL fill:#092E20,color:#fff
    style DJANGO_DRF fill:#44B78B,color:#fff
```

---

## 12. Final Verdict — Given All Constraints

| Criterion | Django + DRF + Channels | FastAPI | Weight |
|---|---|---|---|
| Explicit, readable syntax | ❌ Magic: signals, lazy ORM, Meta | ✅ Every dependency visible | **Critical** |
| No unexpected bugs | ❌ N+1, SynchronousOnlyOperation, signal fires | ✅ Type hints prevent most at write-time | **Critical** |
| Real-time Chat (WS) | ❌ Channels addon + Redis | ✅ Native + Redis pub/sub | **Critical** |
| Live Notifications | ❌ Channels + Celery required | ✅ Same async loop | **Critical** |
| Interactive AI w/ tools | ❌ Celery offload, no streaming | ✅ `await agent.arun()` + streaming | **Critical** |
| Teaches transferable skills | ⚠️ Mostly Django-specific patterns | ✅ Python async, DI, SQLAlchemy, JWT | **High** |
| Not opinionated | ❌ MVT enforced, specific app structure | ✅ Structure freely | **High** |
| Infrastructure simplicity | ❌ 6 services | ✅ 3-4 services | **High** |
| Async I/O | ❌ Blocking WSGI by default | ✅ ASGI native | **High** |
| Built-in Admin UI | ✅ Excellent | ⚠️ SQLAdmin lib | Low |
| ORM & Migrations | ✅ Built-in | ⚠️ SQLAlchemy + Alembic | Medium |
| Time to first route | ✅ Faster | ⚠️ Async setup overhead | Low |

### Score (all constraints included)

```mermaid
xychart-beta
    title "Framework Fit Score per Requirement (0-10)"
    x-axis ["Explicit syntax", "No hidden bugs", "Real-time WS", "AI streaming", "Teaches skills", "Not opinionated", "Infra simplicity"]
    y-axis "Score" 0 --> 10
    bar [9, 8, 9, 9, 9, 9, 8]
    line [3, 4, 4, 2, 4, 3, 3]
```

> 🟦 **Bar** = FastAPI | 🟧 **Line** = Django+Channels+Celery

---

> **Conclusion:**
> Django is opinionated, magic-heavy, and requires 3 bolt-on services (Channels, Celery, Beat) to match FastAPI's built-in async capabilities.
> When something breaks in Django's async stack, the cause is often invisible — split across signals, middleware, and task queues.
>
> FastAPI is explicit by design: every dependency is declared, every async call is visible, type hints catch mistakes before they run. Its bugs are Python bugs — learnable and searchable. Its patterns (async/await, DI, Pydantic, JWT) are transferable across the entire Python ecosystem.
>
> **Chosen architecture:** FastAPI (ASGI) + SQLAlchemy async + Alembic + Redis (Pub/Sub) + PostgreSQL + MongoDB (CVs/chat history) + React/Vue frontend.
