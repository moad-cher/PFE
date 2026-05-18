import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.users.models import User
from sqlalchemy import select

@pytest.mark.asyncio
async def test_register_username_constraints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Test empty username
        response = await ac.post("/auth/register", json={
            "username": "",
            "email": "test_empty@example.com",
            "password": "Password123",
        })
        assert response.status_code == 422
        assert "at least 3 characters" in str(response.json())

        # 2. Test short username
        response = await ac.post("/auth/register", json={
            "username": "ab",
            "email": "test_short@example.com",
            "password": "Password123",
        })
        assert response.status_code == 422
        assert "at least 3 characters" in str(response.json())

        # 3. Test invalid characters
        response = await ac.post("/auth/register", json={
            "username": "user.name",
            "email": "test_invalid_char@example.com",
            "password": "Password123",
        })
        assert response.status_code == 422
        assert "only letters, numbers, and underscores" in str(response.json())

        # 4. Test valid username (cleanup after)
        valid_username = "valid_user_123"
        response = await ac.post("/auth/register", json={
            "username": valid_username,
            "email": "test_valid@example.com",
            "password": "Password123",
        })
        assert response.status_code == 201
        
        # Cleanup
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.username == valid_username))
            user = result.scalar_one_or_none()
            if user:
                await session.delete(user)
                await session.commit()
