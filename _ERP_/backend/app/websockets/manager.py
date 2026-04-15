import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """
    Manages active WebSocket connections grouped by room.
    Room name examples:
      - "chat_project_5"
      - "chat_task_12"
      - "user_3"          (personal notification channel)
    """

    def __init__(self):
        # room_name -> list of WebSocket
        self._rooms: dict[str, list[WebSocket]] = defaultdict(list)
        # ws -> user_id (optional; for rooms that track users)
        self._ws_user: dict[WebSocket, int] = {}

    async def connect(self, ws: WebSocket, room: str, user_id: int | None = None):
        await ws.accept()
        self._rooms[room].append(ws)
        if user_id is not None:
            self._ws_user[ws] = user_id

    def disconnect(self, ws: WebSocket, room: str):
        self._rooms[room] = [c for c in self._rooms[room] if c is not ws]
        self._ws_user.pop(ws, None)

    def get_users_in_room(self, room: str) -> list[int]:
        """Return the list of user_ids currently connected to a room."""
        return [
            self._ws_user[ws]
            for ws in self._rooms.get(room, [])
            if ws in self._ws_user
        ]

    async def broadcast(self, room: str, data: dict[str, Any]):
        dead = []
        for ws in list(self._rooms.get(room, [])):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, room)

    async def send_personal(self, user_id: int, data: dict[str, Any]):
        await self.broadcast(f"user_{user_id}", data)


# Singleton used across the app
ws_manager = ConnectionManager()
