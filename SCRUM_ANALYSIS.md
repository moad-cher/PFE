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

## 5. Observations on Gamification
The `RewardLog` system is a non-standard addition to Scrum. While it can drive engagement, ensure it doesn't overshadow the **Sprint Goal** or lead to "Point Inflation" where quality is sacrificed for speed.
