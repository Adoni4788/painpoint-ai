"""
Trustpilot collector via Apify.

Trustpilot doesn't expose a free public API and their official Business API
costs $1000+/mo. The pragmatic path for a research tool is the Apify
marketplace, where third-party scrapers run pay-per-result at ~$0.25 per
1000 reviews — aligned with revenue (no flat monthly fee).

Architecture:
1. Trustpilot's review pages are keyed on company domain, not keyword.
2. We ask the LLM to suggest 4-5 representative brand domains for the niche
   (ai_service.suggest_brands_for_niche).
3. For each brand, we call the Apify actor with that company URL and a
   per-brand review cap.
4. Aggregate into CollectedPost rows with source="trustpilot".

Failure modes:
- No APIFY_API_TOKEN configured  → return [] (logged, pipeline continues).
- LLM brand suggestion fails    → return [] (no work to do).
- Per-brand Apify call fails    → skip that brand, log, continue.

Cost (calibrated against settings defaults):
  ~5 brands × 30 reviews × $0.25/1000 reviews ≈ $0.04 per search.
"""
import logging
from datetime import datetime, timezone

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings
from .. import ai_service
from ..apify_client import run_actor_sync

logger = logging.getLogger(__name__)

# Cheap, no-monthly-fee Trustpilot reviews scraper. Accepts a company
# domain or full trustpilot.com/review/{domain} URL.
TRUSTPILOT_ACTOR_ID = "automation-lab~trustpilot"


def _parse_review_timestamp(value) -> datetime | None:
    """Best-effort ISO 8601 → naive UTC. Skips anything we can't parse."""
    if not value:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc).replace(tzinfo=None)
        except (OSError, ValueError, OverflowError):
            return None
    if not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
    except ValueError:
        return None


def _extract_review_text(item: dict) -> str:
    """Different Trustpilot actors emit slightly different field names.
    Try the common ones in priority order."""
    for key in ("text", "reviewText", "body", "review", "content", "comment"):
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def _extract_review_title(item: dict) -> str | None:
    for key in ("title", "reviewTitle", "headline"):
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _extract_review_url(item: dict, fallback_domain: str) -> str | None:
    for key in ("url", "reviewUrl", "link"):
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    if fallback_domain:
        return f"https://www.trustpilot.com/review/{fallback_domain}"
    return None


def _extract_review_author(item: dict) -> str | None:
    for key in ("author", "consumerName", "reviewerName", "username"):
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    consumer = item.get("consumer") or {}
    if isinstance(consumer, dict):
        name = consumer.get("displayName") or consumer.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    return None


def _extract_review_timestamp(item: dict) -> datetime | None:
    for key in ("date", "createdAt", "publishedAt", "reviewDate", "datePublished"):
        ts = _parse_review_timestamp(item.get(key))
        if ts is not None:
            return ts
    return None


class TrustpilotCollector(BaseCollector):
    """Collect negative-leaning Trustpilot reviews for brands in the niche."""

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        settings = get_settings()
        token = (settings.apify_api_token or "").strip()
        if not token:
            logger.info("Trustpilot collector skipped: APIFY_API_TOKEN not set.")
            return []

        max_brands = max(1, settings.apify_trustpilot_max_brands)
        per_brand_limit = max(1, settings.apify_trustpilot_reviews_per_brand)

        brands = await ai_service.suggest_brands_for_niche(query, max_brands=max_brands)
        if not brands:
            logger.info("Trustpilot: no brand domains suggested for q=%r", query)
            return []

        logger.info(
            "Trustpilot: scraping %d brand(s) for q=%r (limit=%d/brand)",
            len(brands), query, per_brand_limit,
        )

        posts: list[CollectedPost] = []
        for domain in brands:
            if len(posts) >= limit:
                break
            actor_input = {
                # Most automation-lab/trustpilot variants accept either of these
                # keys. We pass both so the scraper picks whichever it expects.
                "companyDomain": domain,
                "companyDomains": [domain],
                "startUrls": [
                    {"url": f"https://www.trustpilot.com/review/{domain}"}
                ],
                "maxReviews": per_brand_limit,
                "sortBy": "recency",
            }
            rows = await run_actor_sync(
                TRUSTPILOT_ACTOR_ID,
                actor_input,
                limit=per_brand_limit,
                purpose=f"trustpilot:{domain}",
            )
            for item in rows:
                if not isinstance(item, dict):
                    continue
                text = _extract_review_text(item)
                title = _extract_review_title(item)
                if not text and not title:
                    continue
                combined = f"{title}. {text}".strip() if title and text else (text or title or "")
                if len(combined) < 25:
                    continue
                posts.append(
                    CollectedPost(
                        source="trustpilot",
                        title=title,
                        text=combined[:2000],
                        author=_extract_review_author(item),
                        url=_extract_review_url(item, domain),
                        timestamp=_extract_review_timestamp(item),
                    )
                )
                if len(posts) >= limit:
                    break

        logger.info("Trustpilot collected %d reviews across %d brand(s)", len(posts), len(brands))
        return posts[:limit]
