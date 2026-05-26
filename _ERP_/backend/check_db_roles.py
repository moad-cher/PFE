import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_scrum_roles():
    async with engine.connect() as conn:
        print("Checking project_members.scrum_role values...")
        res = await conn.execute(text("SELECT scrum_role, count(*) FROM project_members GROUP BY scrum_role"))
        rows = res.all()
        for row in rows:
            print(f"Value: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_scrum_roles())
