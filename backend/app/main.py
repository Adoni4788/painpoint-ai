# PainPoint AI backend - deploys on backend/** changes
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .core.config import get_settings
from .core.database import init_db
from .api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


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
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PainPoint AI"}
