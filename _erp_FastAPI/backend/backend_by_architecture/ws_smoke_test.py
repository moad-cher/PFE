"""WebSocket smoke test for chat + notifications."""
import asyncio
import json

import httpx
import websockets

BASE_HTTP = "http://localhost:8001"
BASE_WS   = "ws://localhost:8001"


async def main():
    # Obtain token
    r = httpx.post(f"{BASE_HTTP}/auth/token", data={"username": "admin", "password": "admin123"})
    token = r.json()["access_token"]
    projects = httpx.get(f"{BASE_HTTP}/projects/", headers={"Authorization": f"Bearer {token}"}).json()
    pk = projects[0]["id"]

    # ── Notifications WS ──────────────────────────────────────────────
    uri = f"{BASE_WS}/ws/notifications?token={token}"
    async with websockets.connect(uri) as ws:
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "unread_count", f"Expected unread_count, got: {msg}"
        count = msg["count"]
        print(f"WS1. /ws/notifications -> unread_count={count}: OK")

        await ws.send("ping")
        pong = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert pong["type"] == "pong"
        print("WS2. notif ping -> pong: OK")

    # ── Chat WS (project room) ────────────────────────────────────────
    uri = f"{BASE_WS}/ws/chat/project/{pk}?token={token}"
    async with websockets.connect(uri) as ws:
        # History frame
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "history", f"Expected history, got: {msg}"
        num_msgs = len(msg["messages"])
        print(f"WS3. chat history ({num_msgs} msgs): OK")

        # Presence join
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "presence" and msg["event"] == "join"
        online = msg["online_count"]
        print(f"WS4. presence join (online={online}): OK")

        # Send a message
        await ws.send(json.dumps({"type": "message", "content": "Hello WebSocket!"}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "message" and msg["content"] == "Hello WebSocket!"
        mid = msg["id"]
        print(f"WS5. send message -> broadcast (id={mid}): OK")

        # Typing indicator
        await ws.send(json.dumps({"type": "typing"}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "typing"
        print("WS6. typing indicator: OK")

        # Ping/pong
        await ws.send(json.dumps({"type": "ping"}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["type"] == "pong"
        print("WS7. chat ping -> pong: OK")

    # ── Presence leave broadcast (second connection sees it) ──────────
    async with websockets.connect(f"{BASE_WS}/ws/chat/project/{pk}?token={token}") as ws1:
        # consume history + join
        await asyncio.wait_for(ws1.recv(), timeout=5)   # history
        await asyncio.wait_for(ws1.recv(), timeout=5)   # own join

        # open second connection
        async with websockets.connect(f"{BASE_WS}/ws/chat/project/{pk}?token={token}") as ws2:
            await asyncio.wait_for(ws2.recv(), timeout=5)  # history
            await asyncio.wait_for(ws2.recv(), timeout=5)  # own join
            # ws1 should have received ws2's join notification
            join_msg = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
            assert join_msg["type"] == "presence" and join_msg["event"] == "join"
            print(f"WS8. second user join seen by first (online={join_msg['online_count']}): OK")
        # ws2 disconnected — ws1 should get leave
        leave_msg = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
        assert leave_msg["type"] == "presence" and leave_msg["event"] == "leave"
        print(f"WS9. user leave seen by remaining user (online={leave_msg['online_count']}): OK")

    print()
    print("All WebSocket checks passed!")


if __name__ == "__main__":
    asyncio.run(main())
