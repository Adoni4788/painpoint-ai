"""Lemon Squeezy webhook handler.

Flow:
1. User clicks Pro checkout link (URL includes ?checkout[custom][clerk_user_id]=<id>)
2. Lemon Squeezy fires POST /webhooks/lemonsqueezy on order_created
3. We verify the HMAC-SHA256 signature via X-Signature header
4. We PATCH the Clerk user's public_metadata to set pro=true

Required env vars (set in Render):
  LEMON_SQUEEZY_WEBHOOK_SECRET — signing secret from LS dashboard → Webhooks
  CLERK_SECRET_KEY             — sk_live_... from Clerk dashboard → API Keys
"""

import hashlib
import hmac
import logging

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from ..core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

CLERK_API_BASE = "https://api.clerk.com/v1"


def _verify_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request,
    x_signature: str = Header(alias="X-Signature"),
):
    if not settings.lemon_squeezy_webhook_secret:
        logger.error("LEMON_SQUEEZY_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    body = await request.body()

    if not _verify_signature(body, x_signature, settings.lemon_squeezy_webhook_secret):
        logger.warning("Lemon Squeezy webhook signature mismatch")
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = await request.json()

    event = payload.get("meta", {}).get("event_name", "")
    logger.info("Lemon Squeezy webhook received: event=%s", event)

    if event != "order_created":
        return {"received": True}

    clerk_user_id = (
        payload.get("meta", {}).get("custom_data", {}).get("clerk_user_id")
    )
    if not clerk_user_id:
        logger.warning("order_created missing clerk_user_id in custom_data — cannot grant Pro")
        return {"received": True}

    await _grant_pro(clerk_user_id)
    logger.info("Granted Pro to clerk_user_id=%s", clerk_user_id)
    return {"received": True}


async def _grant_pro(clerk_user_id: str) -> None:
    """Set public_metadata.pro = true on the Clerk user via Clerk API."""
    if not settings.clerk_secret_key:
        logger.error("CLERK_SECRET_KEY not configured — cannot update user metadata")
        return

    url = f"{CLERK_API_BASE}/users/{clerk_user_id}"
    headers = {"Authorization": f"Bearer {settings.clerk_secret_key}"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(url, json={"public_metadata": {"pro": True}}, headers=headers)

    if resp.status_code != 200:
        logger.error(
            "Clerk metadata update failed: status=%d body=%s",
            resp.status_code,
            resp.text,
        )
    else:
        logger.info("Clerk user %s marked as pro=true", clerk_user_id)
