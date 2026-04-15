"""Pytest smoke tests for WebSocket chat and notifications."""

import asyncio
import json

import httpx
import pytest
import pytest_asyncio
import websockets

BASE_HTTP = "http://localhost:8001"
BASE_WS = "ws://localhost:8001"
TIMEOUT_SECONDS = 5

pytestmark = [pytest.mark.asyncio, pytest.mark.smoke]


async def _recv_json(ws):
    payload = await asyncio.wait_for(ws.recv(), timeout=TIMEOUT_SECONDS)
    return json.loads(payload)


@pytest_asyncio.fixture(scope="module")
async def ws_context():
    async with httpx.AsyncClient(base_url=BASE_HTTP, timeout=10) as client:
        login = await client.post(
            "/auth/token",
            data={"username": "admin", "password": "admin123"},
        )
        assert login.status_code == 200, f"login failed: {login.text}"

        token = login.json()["access_token"]
        projects = await client.get(
            "/projects/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert projects.status_code == 200, projects.text

        items = projects.json()
        assert items, "no projects available for websocket smoke test"

        return {"token": token, "project_id": items[0]["id"]}


async def test_notifications_ws(ws_context):
    token = ws_context["token"]
    uri = f"{BASE_WS}/ws/notifications?token={token}"

    async with websockets.connect(uri) as ws:
        msg = await _recv_json(ws)
        assert msg["type"] == "unread_count", f"Expected unread_count, got: {msg}"
        assert "count" in msg

        await ws.send("ping")
        pong = await _recv_json(ws)
        assert pong["type"] == "pong"


async def test_chat_ws_basic_flow(ws_context):
    token = ws_context["token"]
    project_id = ws_context["project_id"]
    uri = f"{BASE_WS}/ws/chat/project/{project_id}?token={token}"

    async with websockets.connect(uri) as ws:
        history = await _recv_json(ws)
        assert history["type"] == "history", f"Expected history, got: {history}"
        assert "messages" in history

        presence = await _recv_json(ws)
        assert presence["type"] == "presence"
        assert presence["event"] == "join"

        await ws.send(json.dumps({"type": "message", "content": "Hello WebSocket!"}))
        message = await _recv_json(ws)
        assert message["type"] == "message"
        assert message["content"] == "Hello WebSocket!"
        assert "id" in message

        await ws.send(json.dumps({"type": "typing"}))
        typing = await _recv_json(ws)
        assert typing["type"] == "typing"

        await ws.send(json.dumps({"type": "ping"}))
        pong = await _recv_json(ws)
        assert pong["type"] == "pong"


async def test_chat_ws_presence_leave(ws_context):
    token = ws_context["token"]
    project_id = ws_context["project_id"]
    uri = f"{BASE_WS}/ws/chat/project/{project_id}?token={token}"

    async with websockets.connect(uri) as ws1:
        await _recv_json(ws1)  # history
        await _recv_json(ws1)  # own join

        async with websockets.connect(uri) as ws2:
            await _recv_json(ws2)  # history
            await _recv_json(ws2)  # own join

            join_msg = await _recv_json(ws1)
            assert join_msg["type"] == "presence"
            assert join_msg["event"] == "join"

        leave_msg = await _recv_json(ws1)
        assert leave_msg["type"] == "presence"
        assert leave_msg["event"] == "leave"
