# ensure backend is runing
import io
import pytest
import httpx

BASE_URL = "http://127.0.0.1:8001"


# ══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(client):
    r = client.post("/auth/token", data={"username": "superadmin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ══════════════════════════════════════════════════════════════════════════════
# Auth Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_login_success(client):
    r = client.post("/auth/token", data={"username": "superadmin", "password": "admin123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_invalid_password(client):
    r = client.post("/auth/token", data={"username": "superadmin", "password": "wrongpassword"})
    assert r.status_code == 401


def test_login_invalid_user(client):
    r = client.post("/auth/token", data={"username": "nonexistent", "password": "password"})
    assert r.status_code == 401


def test_protected_route_without_token(client):
    r = client.get("/users/me")
    assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# User Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_get_current_user(client, auth_headers):
    r = client.get("/users/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "superadmin"
    assert "email" in data
    assert "role" in data


def test_get_user_stats(client, auth_headers):
    r = client.get("/users/me/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "active_projects" in data
    assert "tasks_done" in data


def test_change_password_same(client, auth_headers):
    r = client.post(
        "/users/me/password",
        json={"current_password": "admin123", "new_password": "admin123"},
        headers=auth_headers
    )
    assert r.status_code == 204


def test_change_password_wrong_current(client, auth_headers):
    r = client.post(
        "/users/me/password",
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
        headers=auth_headers
    )
    assert r.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Project Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_create_project(client, auth_headers):
    r = client.post(
        "/projects/",
        json={"name": "Unit Test Project", "description": "Created by unit test"},
        headers=auth_headers
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Unit Test Project"
    assert "id" in data
    
    # Cleanup
    client.delete(f"/projects/{data['id']}", headers=auth_headers)


def test_create_project_without_name(client, auth_headers):
    r = client.post("/projects/", json={}, headers=auth_headers)
    assert r.status_code == 422  # Validation error


def test_project_crud_full_cycle(client, auth_headers):
    # Create
    r = client.post(
        "/projects/",
        json={"name": "CRUD Test Project"},
        headers=auth_headers
    )
    assert r.status_code == 201
    project_id = r.json()["id"]
    
    # Read
    r = client.get(f"/projects/{project_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "CRUD Test Project"
    
    # Update
    r = client.patch(
        f"/projects/{project_id}",
        json={"name": "Updated Project Name"},
        headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Project Name"
    
    # Delete
    r = client.delete(f"/projects/{project_id}", headers=auth_headers)
    assert r.status_code == 204
    
    # Verify deleted
    r = client.get(f"/projects/{project_id}", headers=auth_headers)
    assert r.status_code == 404


def test_delete_project_with_chat_messages(client, auth_headers):
    """Test that projects with chat messages can be deleted."""
    # Create project
    r = client.post(
        "/projects/",
        json={"name": "Project with Messages"},
        headers=auth_headers
    )
    assert r.status_code == 201
    project_id = r.json()["id"]
    
    # Send chat message
    r = client.post(
        f"/chat/project/{project_id}",
        json={"content": "Test message"},
        headers=auth_headers
    )
    assert r.status_code == 201
    
    # Delete project (should succeed even with messages)
    r = client.delete(f"/projects/{project_id}", headers=auth_headers)
    assert r.status_code == 204, f"Delete failed: {r.status_code} - {r.text}"


def test_get_nonexistent_project(client, auth_headers):
    r = client.get("/projects/999999", headers=auth_headers)
    assert r.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Task Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_task_crud_full_cycle(client, auth_headers):
    # Create project first
    r = client.post(
        "/projects/",
        json={"name": "Task Test Project"},
        headers=auth_headers
    )
    project_id = r.json()["id"]
    
    # Create task
    r = client.post(
        f"/projects/{project_id}/tasks/",
        json={"title": "Test Task", "priority": "high"},
        headers=auth_headers
    )
    assert r.status_code == 201
    task = r.json()
    assert task["title"] == "Test Task"
    assert task["priority"] == "high"
    task_id = task["id"]
    
    # Read task
    r = client.get(f"/projects/{project_id}/tasks/{task_id}", headers=auth_headers)
    assert r.status_code == 200
    
    # Update task
    r = client.patch(
        f"/projects/{project_id}/tasks/{task_id}",
        json={"title": "Updated Task", "status": "in_progress"},
        headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Updated Task"
    
    # Delete task
    r = client.delete(f"/projects/{project_id}/tasks/{task_id}", headers=auth_headers)
    assert r.status_code == 204
    
    # Cleanup project
    client.delete(f"/projects/{project_id}", headers=auth_headers)


def test_task_move_status(client, auth_headers):
    # Create project
    r = client.post("/projects/", json={"name": "Move Test"}, headers=auth_headers)
    project_id = r.json()["id"]
    
    # Create task
    r = client.post(
        f"/projects/{project_id}/tasks/",
        json={"title": "Task to Move"},
        headers=auth_headers
    )
    task_id = r.json()["id"]
    
    # Move task to in_progress
    r = client.patch(
        f"/projects/{project_id}/tasks/{task_id}/move",
        json={"status": "in_progress"},
        headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"
    
    # Move task to done
    r = client.patch(
        f"/projects/{project_id}/tasks/{task_id}/move",
        json={"status": "done"},
        headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["status"] == "done"
    
    # Cleanup
    client.delete(f"/projects/{project_id}", headers=auth_headers)


# ══════════════════════════════════════════════════════════════════════════════
# Kanban Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_kanban_board(client, auth_headers):
    # Create project
    r = client.post("/projects/", json={"name": "Kanban Test"}, headers=auth_headers)
    project_id = r.json()["id"]
    
    # Get kanban
    r = client.get(f"/projects/{project_id}/kanban", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Should have default statuses
    assert len(data) >= 1
    
    # Cleanup
    client.delete(f"/projects/{project_id}", headers=auth_headers)


# ══════════════════════════════════════════════════════════════════════════════
# Hiring Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_create_job_posting(client, auth_headers):
    r = client.post(
        "/hiring/jobs",
        json={
            "title": "Test Developer",
            "description": "Unit test job posting",
            "contract_type": "cdi",
            "status": "draft"
        },
        headers=auth_headers
    )
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Test Developer"
    assert data["status"] == "draft"


def test_list_published_jobs(client):
    # Public endpoint - no auth needed
    r = client.get("/hiring/jobs?status=published")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_apply_to_job(client, auth_headers):
    # Create a published job
    r = client.post(
        "/hiring/jobs",
        json={
            "title": "Apply Test Job",
            "description": "Test job for application",
            "contract_type": "cdi",
            "status": "published"
        },
        headers=auth_headers
    )
    job_id = r.json()["id"]
    
    # Apply (public endpoint)
    cv_content = b"Test resume content"
    r = client.post(
        f"/hiring/jobs/{job_id}/apply",
        data={
            "first_name": "Test",
            "last_name": "Applicant",
            "email": f"test{job_id}@example.com",
            "cover_letter": "I want this job"
        },
        files={"resume": ("cv.txt", io.BytesIO(cv_content), "text/plain")}
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"


# ══════════════════════════════════════════════════════════════════════════════
# Department Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_department_crud(client, auth_headers):
    import random
    dept_name = f"Test Dept {random.randint(1000, 9999)}"
    
    # Create
    r = client.post(
        "/departments/",
        json={"name": dept_name, "description": "Test department"},
        headers=auth_headers
    )
    assert r.status_code == 201
    dept_id = r.json()["id"]
    
    # List
    r = client.get("/departments/", headers=auth_headers)
    assert r.status_code == 200
    assert any(d["name"] == dept_name for d in r.json())
    
    # Update (must include name since schema is DepartmentCreate)
    r = client.patch(
        f"/departments/{dept_id}",
        json={"name": dept_name, "description": "Updated description"},
        headers=auth_headers
    )
    assert r.status_code == 200
    
    # Delete
    r = client.delete(f"/departments/{dept_id}", headers=auth_headers)
    assert r.status_code == 204


# ══════════════════════════════════════════════════════════════════════════════
# Notification Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_list_notifications(client, auth_headers):
    r = client.get("/notifications/", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_unread_count(client, auth_headers):
    r = client.get("/notifications/unread-count", headers=auth_headers)
    assert r.status_code == 200
    assert "count" in r.json()


# ══════════════════════════════════════════════════════════════════════════════
# Chat Tests
# ══════════════════════════════════════════════════════════════════════════════

def test_project_chat(client, auth_headers):
    # Create project
    r = client.post("/projects/", json={"name": "Chat Test"}, headers=auth_headers)
    project_id = r.json()["id"]
    
    # Send message
    r = client.post(
        f"/chat/project/{project_id}",
        json={"content": "Hello from unit test!"},
        headers=auth_headers
    )
    assert r.status_code == 201
    msg = r.json()
    assert msg["content"] == "Hello from unit test!"
    
    # Get history
    r = client.get(f"/chat/project/{project_id}", headers=auth_headers)
    assert r.status_code == 200
    messages = r.json()
    assert len(messages) >= 1
    
    # Delete message
    r = client.delete(f"/chat/message/{msg['id']}", headers=auth_headers)
    assert r.status_code == 204
    
    # Cleanup
    client.delete(f"/projects/{project_id}", headers=auth_headers)


# ══════════════════════════════════════════════════════════════════════════════
# AI Tests (may fail if Ollama not running)
# ══════════════════════════════════════════════════════════════════════════════

def test_ai_status(client, auth_headers):
    r = client.get("/ai/status", headers=auth_headers)
    assert r.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
