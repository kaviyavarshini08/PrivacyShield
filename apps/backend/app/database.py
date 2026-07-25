from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
import time
import logging

logger = logging.getLogger("sqlalchemy.engine.profiling")

# SQL Query Profiler Event Listeners
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_time = time.time() - context._query_start_time
    # Warn when SQL query execution exceeds 50ms
    if total_time > 0.05:
        logger.warning(f"SLOW SQL QUERY ({total_time:.4f}s): {statement} | Params: {parameters}")
    else:
        logger.debug(f"SQL QUERY ({total_time:.4f}s): {statement}")

# Async connection pool for FastAPI
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    future=True
)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Sync engine for Alembic and worker scripts if needed
sync_engine = create_engine(
    settings.SYNC_DATABASE_URI,
    pool_pre_ping=True
)
SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

import redis.asyncio as aioredis
# Shared async Redis client instance
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
