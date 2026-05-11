"""
Thin Apify client used by the Pro-tier collectors (Trustpilot, Capterra).

Why a separate module: Apify actors share the same auth header, the same
sync-run endpoint, and the same fail-open semantics. Centralising the
boilerplate keeps each collector small and ensures consistent budget /
timeout discipline across paid sources.

Cost discipline:
- Every call passes a `limit` query param so Apify caps how many items the
  actor returns. We never want a search to drain the wallet because a niche
  has thousands of reviews available.
- Calls fail open: if APIFY_API_TOKEN isn't set, we return [] instead of
  raising, so the pipeline degrades gracefully if the operator hasn't
  configured Apify yet.
- We use the run-sync-get-dataset-items endpoint (hard 300s limit), not the
  async run-then-poll dance — the pipeline already has its own timeout.

API reference: https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from ..core.config import get_settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.apify.com/v2"
# Apify's sync endpoint itself hard-caps at 300s. We give ourselves a small
# buffer so our own httpx client times out first with a cleaner error.
_SYNC_TIMEOUT_SECONDS = 280.0


async def run_actor_sync(
    actor_id: str,
    actor_input: dict[str, Any],
    *,
    limit: int | None = None,
    purpose: str = "apify",
) -> list[dict]:
    """
    Run an Apify actor synchronously and return its dataset rows.

    Args:
        actor_id: e.g. "automation-lab/trustpilot" or the "owner~name" form.
        actor_input: dict serialised as JSON body (becomes the actor's INPUT).
        limit: caps the number of dataset items Apify returns (we always
            pass this — actors can't be trusted to honour their own maxItems).
        purpose: label used in log lines so we can attribute Apify cost to a
            specific collector when auditing.

    Returns:
        List of dataset items (dicts) on success; [] on any error (fail open).
    """
    settings = get_settings()
    token = (settings.apify_api_token or "").strip()
    if not token:
        logger.info(
            "Apify token not configured; skipping %s call (actor=%s)",
            purpose, actor_id,
        )
        return []

    # Apify accepts "owner~name" in URL paths. Either form is valid via the
    # API, but the tilde form keeps the URL flat (no extra slash to parse).
    actor_path = actor_id.replace("/", "~")
    params: dict[str, str | int] = {}
    if limit is not None and limit > 0:
        params["limit"] = int(limit)

    url = f"{_BASE_URL}/acts/{actor_path}/run-sync-get-dataset-items"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "PainPointAI/1.0 (+https://gaplens.io)",
    }

    try:
        async with httpx.AsyncClient(timeout=_SYNC_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, params=params, headers=headers, json=actor_input)
        if resp.status_code == 408:
            logger.warning(
                "Apify %s timed out (actor=%s) — pipeline continues without it",
                purpose, actor_id,
            )
            return []
        if resp.status_code == 402:
            logger.warning(
                "Apify %s returned 402 (out of credit?). Skipping. actor=%s",
                purpose, actor_id,
            )
            return []
        if resp.status_code == 401 or resp.status_code == 403:
            logger.error(
                "Apify %s returned %s — check APIFY_API_TOKEN. actor=%s",
                purpose, resp.status_code, actor_id,
            )
            return []
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.warning(
            "Apify HTTP %s for %s (actor=%s): %s",
            e.response.status_code, purpose, actor_id, e.response.text[:200],
        )
        return []
    except (httpx.TimeoutException, httpx.RequestError) as e:
        logger.warning(
            "Apify network error for %s (actor=%s): %s",
            purpose, actor_id, e,
        )
        return []
    except Exception as e:
        logger.error("Apify unexpected error for %s (actor=%s): %s", purpose, actor_id, e)
        return []

    try:
        data = resp.json()
    except ValueError:
        logger.warning(
            "Apify %s returned non-JSON body (actor=%s, first 120 chars=%r)",
            purpose, actor_id, resp.text[:120],
        )
        return []

    if not isinstance(data, list):
        logger.warning(
            "Apify %s expected list, got %s (actor=%s)",
            purpose, type(data).__name__, actor_id,
        )
        return []

    logger.info(
        "Apify %s returned %d row(s) (actor=%s, limit=%s)",
        purpose, len(data), actor_id, limit,
    )
    return data
