import asyncio
import httpx
import io

BASE = "http://127.0.0.1:8001"

async def main():
    async with httpx.AsyncClient(base_url=BASE, timeout=10) as c:
        # ── auth ─────────────────────────────────────────────────────────────
        r = await c.post("/auth/token", data={"username": "superadmin", "password": "admin123"})
        assert r.status_code == 200, f"login: {r.text}"
        tok = r.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        print("✓ Login")

        # ── /users/me ─────────────────────────────────────────────────────────
        me = (await c.get("/users/me", headers=h)).json()
        assert me["username"] == "superadmin"
        print("✓ GET /users/me")

        # ── /users/me/stats ───────────────────────────────────────────────────
        r = await c.get("/users/me/stats", headers=h)
        assert r.status_code == 200, r.text
        stats = r.json()
        assert "active_projects" in stats and "tasks_done" in stats
        print(f"✓ GET /users/me/stats  {stats}")

        # ── departments ───────────────────────────────────────────────────────
        r = await c.post("/departments/", json={"name": "Engineering", "description": "Tech team"}, headers=h)
        assert r.status_code == 201, r.text
        dept_id = r.json()["id"]
        print(f"✓ POST /departments/  id={dept_id}")

        r = await c.get("/departments/", headers=h)
        assert r.status_code == 200 and len(r.json()) > 0
        print(f"✓ GET /departments/  count={len(r.json())}")

        # ── password change ───────────────────────────────────────────────────
        r = await c.post("/users/me/password", json={"current_password": "admin123", "new_password": "admin123"}, headers=h)
        assert r.status_code == 204, r.text
        print("✓ POST /users/me/password")

        # ── admin user management ─────────────────────────────────────────────
        r = await c.get("/users/admin/all", headers=h)
        assert r.status_code == 200
        print(f"✓ GET /users/admin/all  count={len(r.json())}")

        # ── hiring: create published job ──────────────────────────────────────
        r = await c.post("/hiring/jobs", json={"title": "Senior Dev", "description": "FastAPI expert needed", "contract_type": "cdi", "status": "published"}, headers=h)
        assert r.status_code == 201, r.text
        jid = r.json()["id"]
        print(f"✓ POST /hiring/jobs  id={jid}")

        # ── hiring: public apply with resume ──────────────────────────────────
        cv_content = b"Python developer with 5 years FastAPI experience. Skills: Python, FastAPI, PostgreSQL."
        r = await c.post(
            f"/hiring/jobs/{jid}/apply",
            data={"first_name": "Alice", "last_name": "Martin", "email": "alice@example.com", "cover_letter": "I am passionate about FastAPI."},
            files={"resume": ("cv.txt", io.BytesIO(cv_content), "text/plain")},
        )
        assert r.status_code == 201, r.text
        app_id = r.json()["id"]
        print(f"✓ POST /hiring/jobs/{jid}/apply  app_id={app_id}")

        # ── hiring: status filter ─────────────────────────────────────────────
        r = await c.get("/hiring/jobs?status=published")
        assert r.status_code == 200 and any(j["id"] == jid for j in r.json())
        print(f"✓ GET /hiring/jobs?status=published")

        # ── hiring: application detail ────────────────────────────────────────
        r = await c.get(f"/hiring/applications/{app_id}", headers=h)
        assert r.status_code == 200, r.text
        print(f"✓ GET /hiring/applications/{app_id}  status={r.json()['status']}")

        # ── hiring: update status ─────────────────────────────────────────────
        r = await c.patch(f"/hiring/applications/{app_id}/status", json={"status": "reviewed"}, headers=h)
        assert r.status_code == 200 and r.json()["status"] == "reviewed"
        print(f"✓ PATCH /hiring/applications/{app_id}/status → reviewed")

        # ── hiring: schedule interview ────────────────────────────────────────
        r = await c.post(f"/hiring/applications/{app_id}/interviews", json={"scheduled_at": "2026-04-01T10:00:00", "location": "Paris office", "notes": "Technical round"}, headers=h)
        assert r.status_code == 201, r.text
        print(f"✓ POST /hiring/applications/{app_id}/interviews  id={r.json()['id']}")

        # Check status auto-advanced
        r = await c.get(f"/hiring/applications/{app_id}", headers=h)
        assert r.json()["status"] == "interview"
        print(f"✓ Status auto-advanced to 'interview'")

        # ── project + task (regression) ───────────────────────────────────────
        rp = await c.post("/projects/", json={"name": "Test Project"}, headers=h)
        assert rp.status_code == 201, rp.text
        pid = rp.json()["id"]
        rt = await c.post(f"/projects/{pid}/tasks/", json={"title": "Test Task"}, headers=h)
        assert rt.status_code == 201, rt.text
        print(f"✓ Projects + tasks (regression)")

        print("\n✅ All checks passed")

asyncio.run(main())

