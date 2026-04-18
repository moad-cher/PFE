from pathlib import Path
import sys
import os
from types import SimpleNamespace

sys.path.append(str(Path(__file__).resolve().parents[1]))

# Make tests runnable directly (`python tests/ai_contract_test.py`) without
# requiring a local .env in the current working directory.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/erp_test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from fastapi.testclient import TestClient

from app.ai import router as ai_router_module
from app.core.deps import get_current_user
from app.main import app


def _mock_user():
    return SimpleNamespace(id=1, username="contract-tester", role="admin", is_active=True)


def test_ai_chat_contract(monkeypatch):
    captured = {}

    async def fake_ollama_chat(messages, system_prompt="", **kwargs):
        captured["messages"] = messages
        captured["system_prompt"] = system_prompt
        captured["kwargs"] = kwargs
        return "mock-reply"

    app.dependency_overrides[get_current_user] = _mock_user
    monkeypatch.setattr(ai_router_module, "ollama_chat", fake_ollama_chat)

    with TestClient(app) as client:
        response = client.post(
            "/ai/chat",
            json={
                "messages": [{"role": "user", "content": "hello"}],
                "system_prompt": "custom system",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"reply", "model"}
    assert data["reply"] == "mock-reply"
    assert captured["messages"] == [{"role": "user", "content": "hello"}]
    assert captured["system_prompt"] == "custom system"


def test_ai_summarize_contract(monkeypatch):
    captured = {}

    async def fake_ollama_chat(messages, system_prompt="", **kwargs):
        captured["messages"] = messages
        captured["system_prompt"] = system_prompt
        captured["kwargs"] = kwargs
        return "Short summary."

    app.dependency_overrides[get_current_user] = _mock_user
    monkeypatch.setattr(ai_router_module, "ollama_chat", fake_ollama_chat)

    with TestClient(app) as client:
        response = client.post(
            "/ai/summarize",
            json={"text": "Long text here", "max_words": 80, "language": "English"},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"summary", "model"}
    assert data["summary"] == "Short summary."
    assert captured["messages"] == [{"role": "user", "content": "Long text here"}]
    assert "Stay under 80 words" in captured["system_prompt"]


def test_ai_generate_description_contract(monkeypatch):
    captured = {}

    async def fake_ollama_chat(messages, system_prompt="", **kwargs):
        captured["messages"] = messages
        captured["system_prompt"] = system_prompt
        captured["kwargs"] = kwargs
        return "A concise generated description."

    app.dependency_overrides[get_current_user] = _mock_user
    monkeypatch.setattr(ai_router_module, "ollama_chat", fake_ollama_chat)

    with TestClient(app) as client:
        response = client.post(
            "/ai/generate-description",
            json={"title": "Hiring Pipeline Revamp", "context": "project", "language": "English"},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"description", "model"}
    assert data["description"] == "A concise generated description."
    assert captured["messages"] == [
        {"role": "user", "content": "Write a description for this project: Hiring Pipeline Revamp"}
    ]
    assert "professional project description writer" in captured["system_prompt"]


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-q"]))
