import sys
import os
import asyncio
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(__file__))
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"))
        tables = [row[0] for row in res.fetchall()]
        print("ACTIVE POSTGRESQL TABLES:", tables)

if __name__ == "__main__":
    asyncio.run(main())
