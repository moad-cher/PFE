---
description: "Use when editing ERP application code in this repo, including FastAPI backend domains and React frontend flows. Enforces minimal behavior-safe diffs, backend-first authorization, existing project patterns, and cross-surface feature sync."
name: "ERP Development Rules"
applyTo: "_erp_FastAPI/{frontend,backend}/**"
---
# ERP Development Rules

## Scope
- Optimize for small, precise diffs in this ERP repository.

## Active code paths
- Use `_erp_FastAPI/frontend` and `_erp_FastAPI/backend` as primary source.

## Stack
- Frontend: React + Vite + React Router + Tailwind
- Backend: FastAPI (domain-driven modules)
- Auth context: `useAuth()` (`frontend/src/context/AuthContext.jsx`)
- Frontend API helper: `frontend/src/api.js`

## Backend layout (`_erp_FastAPI/backend/app`)
- Domains: `auth`, `users`, `projects`, `tasks`, `hiring`, `notifications`, `messaging`, `ai`
- Shared infra: `core`, `websockets`
- Entry point: `main.py`

## Editing rules
- Prefer minimal, behavior-safe changes.
- Reuse existing components/helpers before creating new ones.
- Keep FastAPI routers thin; place business logic in domain services/helpers.
- Keep role checks enforced on backend (not UI-only).
- Preserve existing naming, file organization, and Tailwind patterns.
- Avoid new dependencies unless required.

## Role awareness
- Common roles: `admin`, `hr_manager`, `project_manager`, `team_member`.

## Sync points for feature changes
When a feature changes, update all relevant surfaces together:
1. FastAPI route/schema/model/service
2. Frontend page/component/API call
3. Role-based UI gating (e.g., `Navbar`, protected routes)
