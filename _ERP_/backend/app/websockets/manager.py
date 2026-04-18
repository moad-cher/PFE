import asyncio
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections grouped by room.
    Provides atomic updates and background cleanup of dead connections.
    """

    def __init__(self):
        # room_name -> set of WebSocket for efficient O(1) removals
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        # ws -> user_id (optional; for rooms that track users)
        self._ws_user: dict[WebSocket, int] = {}
        # ws -> set of rooms (tracks which rooms a connection belongs to)
        self._ws_rooms: dict[WebSocket, set[str]] = defaultdict(set)
        # Lock to ensure atomic operations on shared state
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, room: str, user_id: int | None = None):
        """Register a connection in the specified room. Assumes ws is already accepted."""
        async with self._lock:
            self._rooms[room].add(ws)
            self._ws_rooms[ws].add(room)
            if user_id is not None:
                self._ws_user[ws] = user_id

    async def disconnect(self, ws: WebSocket, room: str | None = None):
        """
        Unregister a WebSocket.
        If room is provided, only removes from that specific room.
        If room is None, removes from ALL rooms (full cleanup).
        """
        async with self._lock:
            if room:
                self._rooms[room].discard(ws)
                self._ws_rooms[ws].discard(room)
                if not self._rooms[room]:
                    self._rooms.pop(room, None)
                # If the connection is no longer in any rooms, clean up user mapping
                if not self._ws_rooms[ws]:
                    self._ws_rooms.pop(ws, None)
                    self._ws_user.pop(ws, None)
            else:
                # Full cleanup for this connection
                rooms = self._ws_rooms.pop(ws, set())
                for r in rooms:
                    self._rooms[r].discard(ws)
                    if not self._rooms[r]:
                        self._rooms.pop(r, None)
                self._ws_user.pop(ws, None)

    def get_users_in_room(self, room: str) -> list[int]:
        """Return the list of user_ids currently connected to a room."""
        # Note: self._rooms[room] is a set of WebSockets.
        # We iterate and fetch their associated user_ids.
        connections = self._rooms.get(room, set())
        return [
            self._ws_user[ws]
            for ws in connections
            if ws in self._ws_user
        ]

    async def broadcast(self, room: str, data: dict[str, Any]):
        """
        Send a JSON message to all connections in a room.
        Prunes dead connections encountered during the process.
        """
        # Snapshot connections to avoid holding the lock during I/O
        async with self._lock:
            connections = list(self._rooms.get(room, set()))
        
        if not connections:
            return

        dead = []
        for ws in connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        
        # Clean up dead connections discovered during broadcast
        for ws in dead:
            await self.disconnect(ws, room)

    async def prune_dead_connections(self):
        """
        Iterate over all active connections and verify they are still alive
        by sending a lightweight heartbeat.
        """
        async with self._lock:
            all_ws = list(self._ws_rooms.keys())
        
        dead = []
        for ws in all_ws:
            try:
                # Ping with a custom type that clients should ignore
                await ws.send_json({"type": "ping_server"})
            except Exception:
                dead.append(ws)
        
        for ws in dead:
            await self.disconnect(ws)

    async def send_personal(self, user_id: int, data: dict[str, Any]):
        """Send a message to a specific user's notification room."""
        await self.broadcast(f"user_{user_id}", data)


# Singleton used across the app
ws_manager = ConnectionManager()


async def heartbeat_worker(manager: ConnectionManager, interval: int = 30):
    """
    Background loop that triggers pruning of dead connections.
    Should be started during application startup.
    """
    logger.info("Starting WebSocket heartbeat worker")
    while True:
        try:
            await asyncio.sleep(interval)
            await manager.prune_dead_connections()
        except asyncio.CancelledError:
            logger.info("WebSocket heartbeat worker stopped")
            break
        except Exception as e:
            logger.error(f"Error in heartbeat_worker: {e}")
