# Scrum Management System Analysis & Proposed Refinement

This document evaluates the current ERP implementation against the **Official Scrum Guide (2020)** and proposes modifications to better align with Scrum principles.

## 1. Current Implementation Evaluation

### Core Artifacts
- **Product Backlog:** ✅ **Aligned.** `Stories` linked to a `Project` (where `sprint_id` is null) correctly represent the Product Backlog.
- **Sprint Backlog:** ✅ **Aligned.** The hierarchy (`Sprint` -> `Story` -> `Task`) accurately reflects the Sprint Backlog as both the selected items and the plan (tasks) to deliver them.
- **Increment:** ⚠️ **Partial.** The system tracks points and "freezes" them on completion, but the definition of "Done" should be more explicit.

### Roles & Accountability
- **Current State:** Uses traditional hierarchy: `Admin`, `Project Manager`, `Team Member`.
- **Scrum Alignment:** ❌ **Misaligned.** Scrum recognizes only **Product Owner**, **Scrum Master**, and **Developers**. A "Project Manager" role often implies top-down control which contradicts the principle of a **self-managing** team.

### Events & Ceremonies
- **The Sprint:** ✅ **Aligned.** Fixed durations with clear states (draft, active, completed).
- **Retrospective:** ✅ **High Alignment.** The `Sprint` model includes a specific field for retrospective notes, directly supporting this key event.

---

## 2. Proposed Permission Modifications

To respect Scrum's principle of **Self-Organization**, the team (Developers) must own the Sprint Backlog. The current "Manager-only" restrictions on task creation and assignment should be relaxed.

### Frontend: `src/auth/permissions.js`

#### Suggested Roles
```javascript
export const ROLES = {
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  PRODUCT_OWNER: 'product_owner', // Renamed from project_manager
  SCRUM_MASTER: 'scrum_master',   // New Role
  DEVELOPER: 'developer',         // Renamed from team_member
};
```

#### Shift to Self-Organization
| Logic Function | Proposed Change | Scrum Rationale |
| :--- | :--- | :--- |
| `canCreateTask` | Allow all project members. | Developers break down Stories into Tasks during the Sprint. |
| `canReassignTask` | Allow all project members. | The team is self-managing; anyone can pick up or move a task. |
| `canDeleteTask` | Allow all project members. | The team owns the Sprint plan (Tasks). |

---

## 3. Implementation Roadmap

Changing the frontend alone will cause 403 Forbidden errors because the backend enforces these rules. A synchronized update is required:

1.  **Database Layer (`app/users/models.py`):** Update `RoleEnum` to include `product_owner`, `scrum_master`, and `developer`.
2.  **Backend Logic (`app/auth/permissions.py`):**
    *   Map `can_manage_project` to PO/SM roles.
    *   Update `can_create_task` and `can_reassign_task` to allow anyone with `can_access_project`.
3.  **Frontend Logic (`src/auth/permissions.js`):** Mirror the backend changes to provide a seamless UI experience (showing/hiding buttons correctly).

## 4. Observations on Gamification
The `RewardLog` system is a non-standard addition to Scrum. While it can drive engagement, ensure it doesn't overshadow the **Sprint Goal** or lead to "Point Inflation" where quality is sacrificed for speed.
