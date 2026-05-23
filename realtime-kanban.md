# Real-time Scrum Kanban: Strategic Plan

## Objective
Transform the current "Project Management" style Scrum view into a high-performance, collaborative **Agile Execution Board** with real-time synchronization and clear separation of concerns.

---

## 1. UI/UX Refactor: The Tabbed Experience
Move away from the single vertical timeline to a focused, three-tab navigation within the Scrum view:

### A. Active Board (Execution Focus)
*   **The View:** A Kanban-style board for the **Current Active Sprint**.
*   **Columns:** `To Do`, `In Progress`, `Review`, `Done`.
*   **Swimlanes (Togglable):**
    *   **By Story:** Classic Scrum view where tasks move across the story row.
    *   **By Assignee:** For Daily Standups (identify bottlenecks).
    *   **By Priority:** Focus on "Critical" items first.
*   **Real-time:** Tasks fly across columns as teammates move them.

### B. Planning (Backlog & Grooming)
*   **The View:** Side-by-side view of **Product Backlog** and **Draft Sprints**.
*   **Action:** Drag-and-drop stories from backlog to future sprints.
*   **Metric:** Show cumulative Story Points vs. Team Velocity.

### C. Archive (Retrospective & History)
*   **The View:** List of **Completed Sprints**.
*   **Content:** Goal status, Burndown results, and Retrospective notes.

---

## 2. Real-time Engine (WebSockets)
Leverage existing `RealTimeContext` and FastAPI WebSockets to synchronize state.

### WebSocket Event Schema
```json
{
  "type": "TASK_UPDATED",
  "project_id": "uuid",
  "data": {
    "task_id": 123,
    "status": "in-progress",
    "updated_by": {
      "id": 1,
      "username": "moad",
      "avatar": "url"
    },
    "timestamp": "ISO-8601"
  }
}
```

### Sync Strategy
1.  **Optimistic UI:** Update the local state immediately when the current user drags a card.
2.  **Conflict Resolution:** If a user is currently dragging Task X, ignore incoming WS updates for Task X until they drop it.
3.  **Visual Cues:** Brief highlight/animation on a card when updated by someone else.

---

## 3. "Last Edit By" Attribution
Ensure transparency by tracking who touched what.

### Backend Requirements:
*   Add `last_edited_by_id` (FK to User) and `updated_at` to `Task` and `Story` models.
*   Update these fields in the `update_task` and `update_story` endpoints using the `current_user` dependency.

### Frontend Requirements:
*   Add a tiny "attribution" line to Kanban cards: `2m ago by moad`.
*   Show "Ghost" notifications: *"Sarah moved 'Refactor API' to Review"*.

---

## 4. Implementation Roadmap

### Phase 1: Data Foundations (Backend)
- [ ] Add `last_edited_by` fields to Models.
- [ ] Update Schemas to include attribution data.
- [ ] Implement `ProjectBroadcaster` utility to push updates to WebSocket channels.

### Phase 2: Structural UI (Frontend)
- [ ] Implement the Tabbed Navigation in `ScrumBoard.jsx`.
- [ ] Create `ActiveBoard.jsx` component with basic Kanban columns.

### Phase 3: The "Brain" (Swimlanes & DnD)
- [ ] Implement `groupBy` logic for tasks.
- [ ] Integrate `@hello-pangea/dnd` for task-status movements.

### Phase 4: Real-time Wiring
- [ ] Connect `ActiveBoard` to `RealTimeContext`.
- [ ] Add broadcast triggers to Backend API routers.
- [ ] Implement "Ghost" updates and highlight animations.
