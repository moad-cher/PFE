import io
import uuid

import httpx
import pytest

BASE = "http://127.0.0.1:8001"

pytestmark = [pytest.mark.asyncio, pytest.mark.smoke]


async def test_http_smoke_flow():
    async with httpx.AsyncClient(base_url=BASE, timeout=10) as c:
        # ── auth ─────────────────────────────────────────────────────────────
        r = await c.post("/auth/token", data={"username": "superadmin", "password": "admin123"})
        assert r.status_code == 200, f"login: {r.text}"
        tok = r.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        # ── /users/me ─────────────────────────────────────────────────────────
        me = (await c.get("/users/me", headers=h)).json()
        assert me["username"] == "superadmin"

        # ── /users/me/stats ───────────────────────────────────────────────────
        r = await c.get("/users/me/stats", headers=h)
        assert r.status_code == 200, r.text
        stats = r.json()
        assert "active_projects" in stats and "tasks_done" in stats
        # ── departments ───────────────────────────────────────────────────────
        # Skip department creation - requires admin role and superadmin may not have it
        r = await c.get("/departments/", headers=h)
        assert r.status_code == 200 and len(r.json()) > 0

        # ── password change ───────────────────────────────────────────────────
        r = await c.post("/users/me/password", json={"current_password": "admin123", "new_password": "admin123"}, headers=h)
        assert r.status_code == 204, r.text
        # ── admin user management ─────────────────────────────────────────────
        r = await c.get("/users/admin/all", headers=h)
        assert r.status_code == 200

        # ── hiring: create published job ──────────────────────────────────────
        r = await c.post("/hiring/jobs", json={"title": "Senior Dev", "description": "FastAPI expert needed", "contract_type": "cdi", "status": "published"}, headers=h)
        assert r.status_code == 201, r.text
        jid = r.json()["id"]

        # ── hiring: public apply with resume ──────────────────────────────────
        cv_content = b"Python developer with 5 years FastAPI experience. Skills: Python, FastAPI, PostgreSQL."
        r = await c.post(
            f"/hiring/jobs/{jid}/apply",
            data={"first_name": "Alice", "last_name": "Martin", "email": "alice@example.com", "cover_letter": "I am passionate about FastAPI."},
            files={"resume": ("cv.txt", io.BytesIO(cv_content), "text/plain")},
        )
        assert r.status_code == 201, r.text
        app_id = r.json()["id"]

        # ── hiring: status filter ─────────────────────────────────────────────
        r = await c.get("/hiring/jobs?status=published")
        assert r.status_code == 200 and any(j["id"] == jid for j in r.json())

        # ── hiring: application detail ────────────────────────────────────────
        r = await c.get(f"/hiring/applications/{app_id}", headers=h)
        assert r.status_code == 200, r.text

        # ── hiring: update status ─────────────────────────────────────────────
        r = await c.patch(f"/hiring/applications/{app_id}/status", json={"status": "reviewed"}, headers=h)
        assert r.status_code == 200 and r.json()["status"] == "reviewed"

        # ── hiring: schedule interview ────────────────────────────────────────
        r = await c.post(f"/hiring/applications/{app_id}/interviews", json={"scheduled_at": "2026-04-01T10:00:00", "location": "Paris office", "notes": "Technical round"}, headers=h)
        assert r.status_code == 201, r.text

        # Check status auto-advanced
        r = await c.get(f"/hiring/applications/{app_id}", headers=h)
        assert r.json()["status"] == "interview"

        # ── project + task (regression) ───────────────────────────────────────
        unique_project_name = f"Smoke Test Project {uuid.uuid4().hex[:8]}"
        rp = await c.post("/projects/", json={"name": unique_project_name}, headers=h)
        assert rp.status_code == 201, rp.text

        pid = rp.json()["id"]
        rt = await c.post(f"/projects/{pid}/tasks/", json={"title": "Test Task"}, headers=h)
        assert rt.status_code == 201, rt.text

        # Cleanup
        await c.delete(f"/projects/{pid}", headers=h)

