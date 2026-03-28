import asyncio, asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://postgres:123@localhost:5432/postgres")
    try:
        await conn.execute("CREATE DATABASE erp_db")
        print("erp_db created")
    except Exception as e:
        print(f"Note: {e}")
    finally:
        await conn.close()

asyncio.run(main())
