"""Clerk JWT authentication — FastAPI dependency.

Flow per request:
1. Extract Bearer token from Authorization header
2. Fetch Clerk JWKS from {CLERK_ISSUER_URL}/.well-known/jwks.json  (cached 1 hr)
3. Verify JWT signature with python-jose
4. Extract `sub` (clerk_id) and `email` from claims
5. Find or create User row (auto-registers on first login)
6. Return User for use in route handlers

Dev mode: if CLERK_ISSUER_URL is not set, get_current_user returns None
and all routes work without authentication (local development only).
"""

import logging
from typing import Optional

import httpx
from cachetools import TTLCache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import get_db

logger = logging.getLogger(__name__)
settings = get_settings()

_bearer = HTTPBearer(auto_error=False)

# JWKS cached for 1 hour — avoids a round-trip to Clerk on every request
_jwks_cache: TTLCache = TTLCache(maxsize=1, ttl=3600)


async def _get_jwks() -> dict:
    """Fetch Clerk JWKS from well-known endpoint (cached 1 hr)."""
    cached = _jwks_cache.get("jwks")
    if cached is not None:
        return cached

    issuer_url = settings.clerk_issuer_url.rstrip("/")
    url = f"{issuer_url}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    jwks = resp.json()
    _jwks_cache["jwks"] = jwks
    logger.info("Fetched and cached Clerk JWKS from %s", url)
    return jwks


async def _verify_token(token: str) -> dict:
    """Decode and verify a Clerk JWT. Returns the claims dict."""
    jwks = await _get_jwks()
    try:
        issuer = settings.clerk_issuer_url.rstrip("/")
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},  # Clerk JWTs have no `aud` by default
        )
        return claims
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """FastAPI dependency — returns the authenticated User row.

    Returns None when CLERK_ISSUER_URL is not configured (dev mode).
    Raises 401 when auth IS configured but token is missing or invalid.
    Auto-creates a User row on first login (sign-up handled entirely by Clerk).
    """
    # Lazy import to avoid circular imports between models and auth
    from ..models.search import User

    if not settings.clerk_issuer_url:
        # Dev mode: auth disabled, no user filtering.
        # SAFETY: In production this env var must always be set.
        if settings.environment.lower() in ("production", "prod"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication is not configured. Contact support.",
            )
        return None

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    claims = await _verify_token(credentials.credentials)

    clerk_id: str | None = claims.get("sub")
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim.",
        )

    # Find existing user or create on first login
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user is None:
        email: str = claims.get("email", "") or ""
        user = User(clerk_id=clerk_id, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Auto-created new user clerk_id=%s email=%s", clerk_id, email)

    return user
