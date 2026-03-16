from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()

# pool_size / max_overflow sized for Render free-tier PostgreSQL (M1).
# pool_recycle avoids stale connections after long idle periods.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)
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
    """
    Create all tables on a fresh database.

    For schema migrations on an existing database, use Alembic:
        cd backend && alembic upgrade head

    The inline ALTER TABLE calls that previously lived here have been moved
    into the Alembic initial migration (alembic/versions/001_initial_schema.py).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
