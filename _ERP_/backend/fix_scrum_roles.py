import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix_scrum_roles():
    async with engine.connect() as conn:
        print("Normalizing scrumrole Enum values...")
        # Add lowercase values if missing
        for val in ['product_owner', 'scrum_master', 'team_member']:
            try:
                res = await conn.execute(text(f"SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'scrumrole' AND enumlabel = '{val}'"))
                if not res.scalar():
                    await conn.execute(text(f"ALTER TYPE scrumrole ADD VALUE '{val}'"))
                    await conn.commit()
                    print(f"Added '{val}' to scrumrole")
            except Exception as e:
                print(f"Error adding '{val}': {e}")

    async with engine.begin() as conn:
        print("Normalizing project_members.scrum_role to lowercase/standard naming...")
        await conn.execute(text("UPDATE project_members SET scrum_role = 'product_owner' WHERE scrum_role = 'PRODUCT_OWNER'"))
        await conn.execute(text("UPDATE project_members SET scrum_role = 'scrum_master' WHERE scrum_role = 'SCRUM_MASTER'"))
        await conn.execute(text("UPDATE project_members SET scrum_role = 'team_member' WHERE scrum_role IN ('TEAM_MEMBER', 'employee')"))
        
        print("Normalizing users.role to lowercase/standard naming...")
        await conn.execute(text("UPDATE users SET role = 'employee' WHERE role = 'team_member'"))
        print("Normalization complete.")

if __name__ == "__main__":
    asyncio.run(fix_scrum_roles())
