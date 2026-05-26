import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_user_roles():
    async with engine.connect() as conn:
        print("Checking users.role values...")
        res = await conn.execute(text("SELECT role, count(*) FROM users GROUP BY role"))
        rows = res.all()
        for row in rows:
            print(f"Value: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_user_roles())
