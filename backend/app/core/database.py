from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=20, pool_timeout=60)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migration: add summary column to searches if missing
        await conn.execute(text("ALTER TABLE searches ADD COLUMN IF NOT EXISTS summary TEXT"))
        # Migration: add workspace_id to searches if missing (run after workspaces table exists)
        await conn.execute(text(
            "ALTER TABLE searches ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id)"
        ))
