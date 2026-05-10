# PainPoint AI backend - deploys on backend/** changes
import logging
import logging.config
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.config import get_settings
from .core.database import init_db
from .core.limiter import limiter
from .api.routes import router
from .api.webhooks import router as webhooks_router
from .api.digest import router as digest_router
from .api.trends import router as trends_router

# ---------------------------------------------------------------------------
# Structured logging — JSON-style lines, easier to filter in Render / Sentry
# ---------------------------------------------------------------------------
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": (
                '{"time": "%(asctime)s", "level": "%(levelname)s",'
                ' "logger": "%(name)s", "msg": %(message)r}'
            ),
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "structured"}
    },
    "root": {"level": "INFO", "handlers": ["console"]},
})
logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Sentry (no-op if SENTRY_DSN not set)
# ---------------------------------------------------------------------------
if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration(), LoggingIntegration()],
        traces_sample_rate=0.1,
        environment="production",
    )


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
async def _mark_stale_searches_failed() -> None:
    """
    Render can restart a worker while FastAPI BackgroundTasks are mid-pipeline.
    Mark old in-flight searches failed on boot so they do not reserve quota or
    sit forever as "scoring"/"collecting" in the UI.
    """
    from datetime import timedelta

    from sqlalchemy import update

    from .core.database import async_session
    from .core.utils import utcnow
    from .models.search import Search
    from .services.pipeline import IN_PROGRESS_STATUSES

    cutoff = utcnow() - timedelta(seconds=settings.pipeline_timeout_seconds + 120)
    async with async_session() as db:
        result = await db.execute(
            update(Search)
            .where(Search.status.in_(IN_PROGRESS_STATUSES))
            .where(Search.created_at < cutoff)
            .values(
                status="failed",
                is_quota_billable=False,
                completed_at=utcnow(),
            )
        )
        await db.commit()
        if result.rowcount:
            logger.warning("Marked %d stale in-progress search(es) as failed", result.rowcount)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PainPoint AI backend...")
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Set it in .env or environment variables before starting."
        )
    if not settings.clerk_issuer_url:
        logger.warning(
            "CLERK_ISSUER_URL is not set — all /api/* routes are unauthenticated. "
            "Set CLERK_ISSUER_URL in production."
        )
    await init_db()
    logger.info("Database initialized")
    await _mark_stale_searches_failed()
    yield
    logger.info("Shutting down PainPoint AI backend...")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PainPoint AI",
    description="Opportunity discovery engine that turns public complaints into product ideas",
    version="0.1.0",
    lifespan=lifespan,
    # Hide interactive docs in production to reduce attack surface
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — strip whitespace from each origin so "https://a.com, https://b.com" works (H5)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router, prefix="/api")
app.include_router(webhooks_router)  # /webhooks/lemonsqueezy — no /api prefix, called by LS servers
app.include_router(digest_router, prefix="/api")  # /api/digest/send — triggered by Render cron job
app.include_router(trends_router, prefix="/api")  # /api/trends/* — longitudinal pain trends


# ---------------------------------------------------------------------------
# Auth is now handled per-route via Clerk JWT (see core/auth.py).
# The old X-Api-Key middleware has been removed — no middleware needed here.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    detail = (
        str(exc) if settings.debug
        else "An unexpected error occurred. Please try again."
    )
    return JSONResponse(status_code=500, content={"detail": detail})


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    from .core.database import async_session
    from sqlalchemy import text

    db_status = "ok"
    try:
        async with async_session() as db:
            await db.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning("Health check DB failure: %s", e)
        db_status = "unavailable"

    body = {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "PainPoint AI",
        "db": db_status,
        "auth_enabled": bool(settings.clerk_issuer_url),
    }
    # Return 503 when degraded so Render's load balancer / external monitors
    # can route around / page on a dead instance instead of getting a green 200.
    return JSONResponse(content=body, status_code=200 if db_status == "ok" else 503)
