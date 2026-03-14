# PainPoint AI backend - deploys on backend/** changes
import logging
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Sentry (no-op if SENTRY_DSN not set)
if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration(), LoggingIntegration()],
        traces_sample_rate=0.1,
        environment="production" if settings.sentry_dsn else "development",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PainPoint AI backend...")
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Set it in .env or environment variables before starting the backend."
        )
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down PainPoint AI backend...")


app = FastAPI(
    title="PainPoint AI",
    description="Opportunity discovery engine that turns public complaints into product ideas",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return structured error response for unhandled exceptions."""
    logger.exception("Unhandled exception: %s", exc)
    detail = str(exc) if get_settings().debug else "An unexpected error occurred. Please try again."
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PainPoint AI"}
