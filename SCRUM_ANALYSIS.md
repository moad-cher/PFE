# Scrum Management System Analysis & Proposed Refinement

This document evaluates the current ERP implementation against the **Official Scrum Guide (2020)** and proposes modifications to better align with Scrum principles.

## 1. Current Implementation Evaluation

### Core Artifacts
- **Product Backlog:** ✅ **Aligned.** `Stories` linked to a `Project` (where `sprint_id` is null) correctly represent the Product Backlog.
- **Sprint Backlog:** ✅ **Aligned.** The hierarchy (`Sprint` -> `Story` -> `Task`) accurately reflects the Sprint Backlog as both the selected items and the plan (tasks) to deliver them.
- **Increment:** ⚠️ **Partial.** The system tracks points and "freezes" them on completion, but the definition of "Done" should be more explicit.

### Roles & Accountability
- **Current State:** Uses traditional hierarchy: `Admin`, `Project Manager`, `Team Member`.
- **Scrum Alignment:** ⚠️ **Contextual.** Keep global roles as-is for centralized governance, and introduce Scrum roles as **project-scoped** assignments (per member per project). This preserves centralized control while still mapping Scrum accountability within each project.

### Events & Ceremonies
- **The Sprint:** ✅ **Aligned.** Fixed durations with clear states (draft, active, completed).
- **Retrospective:** ✅ **High Alignment.** The `Sprint` model includes a specific field for retrospective notes, directly supporting this key event.

---

## 2. Proposed Scrum Role Context (Centralized Control)

Maintain centralized management and keep **global roles unchanged**. Add **Scrum roles** as a required, project-scoped attribute on each `project_members` record. Scrum roles become descriptive and workflow-oriented, while permissions remain centralized.

### Project-Scoped Scrum Roles (New Column)
```text
project_members.scrum_role (required)
- product_owner
- scrum_master
- developer
```

### Permissions (No Change)
| Logic Function | Proposed Change | Rationale |
| :--- | :--- | :--- |
| `canCreateTask` | Keep manager-only. | Centralized control remains the policy. |
| `canReassignTask` | Keep manager-only. | Centralized control remains the policy. |
| `canDeleteTask` | Keep manager-only. | Centralized control remains the policy. |

---

## 3. Implementation Checklist (Concrete Files)

### Database + Models
- Convert `project_members` from a plain association table into a model so it can store `scrum_role`.
- Add `scrum_role` as a required field with allowed values: `product_owner`, `scrum_master`, `developer`.
- Backfill existing members with a default (suggested: `developer`) and ensure the project manager gets PO or SM.

**Files:**
- `app/projects/models.py` (new `ProjectMember` model + relationship updates)

### Schemas + API Responses
- Expose `scrum_role` in project member responses (used by the Members screen).
- Add a request payload for updating a member's `scrum_role`.

**Files:**
- `app/projects/schemas.py` (member read/update schema)
- `app/projects/router.py` (include `scrum_role` in members list; add update endpoint)

### Permissions (Keep Centralized)
- Keep existing permission logic unchanged.
- Document that Scrum roles are descriptive only (not authorization).

**Files:**
- `app/auth/permissions.py` (no logic change; add comment if needed)

### Frontend UI
- Display each member’s `scrum_role` in the members list.
- Add a dropdown to update `scrum_role` (visible to manager/admin only).

**Files:**
- `frontend/src/pages/projects/Members.jsx`
- `frontend/src/api.js` (new endpoint call)

### Migration + Defaults
- Add a migration step for the new column or table.
- Default new members to `developer`.

---

## 4. Implementation Roadmap

Changing the frontend alone will cause mismatches if the backend does not expose the new project-scoped role. A synchronized update is required:

1.  **Database Layer (`app/projects/models.py` or `app/users/models.py`):** Add required `scrum_role` to `project_members` with allowed values (`product_owner`, `scrum_master`, `developer`).
2.  **Backend Logic (`app/auth/permissions.py`):** Keep centralized checks unchanged. Add `scrum_role` to project member responses for UI display.
3.  **Frontend Logic (`src/auth/permissions.js` and project member UI):**
  *   Keep global roles as-is.
  *   Add Scrum role selection per project member and show it in project context.
  *   Do not alter task creation/reassignment permissions.

## 6. Sprint Transition Timeline: Theory vs. Code

This section compares the **Official Scrum Transition** with the current implementation in `app/projects/router.py`.

### A. The Scrum Theory (Transition Phases)
According to the Scrum Guide, the transition between Sprints follows a strict sequence:
1.  **Sprint Review (Inspection):** The team and stakeholders inspect the Increment. Unfinished items are moved back to the **Product Backlog**.
2.  **Sprint Retrospective (Adaptation):** The team inspects itself and plans improvements.
3.  **Sprint Completion:** The active Sprint is closed.
4.  **Sprint Planning (Initialization):** The Product Owner and Developers select items from the Product Backlog for the **next** Sprint, define the Sprint Goal, and create the Sprint Backlog (tasks).

### B. The Current Implementation (`router.py`)
In the current code, the transition is triggered by a single `PATCH` request to the Sprint endpoint with `status="completed"`.

| Feature | Current Implementation Logic | Alignment |
| :--- | :--- | :--- |
| **Product Backlog** | stories sorted by `order` field. | ✅ **Aligned.** |
| **Retrospective** | Handled as a static `Text` field updated during the `PATCH` call. | ⚠️ **Passive.** No enforced ceremony or collaborative capture. |
| **Story Ordering** | Supported via drag-and-drop and bulk update API. | ✅ **Aligned.** |
| **Sprint Planning** | New sprints are created as `draft`. Planning consists of `PATCH`ing stories to set their `sprint_id`. | ✅ **Functional.** |

### C. Gaps and Future Refinements
1.  **Ceremony Flow:** The "Complete Sprint" button in `ScrumBoard.jsx` currently closes the sprint in one click. To align with Scrum, it should be a **multi-step wizard**:
    *   **Step 1 (Review):** Confirm status of stories.
    *   **Step 2 (Retrospective):** Capture structured notes (Positive/Negative/Actions).
    *   **Step 3 (Planning):** Define the **Goal** for the next sprint before starting it.
2.  **Product Backlog Re-prioritization:** Currently, unfinished stories jump directly into the next sprint. Scrum dictates they should go to the Backlog for the Product Owner to re-evaluate their priority before the next Planning.
3.  **Goal-Centric Planning:** The code validates dates and overlaps but does not enforce that a **Sprint Goal** must be set before a Sprint can be moved to `active`.

