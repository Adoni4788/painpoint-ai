"""
Capterra collector via Apify.

Capterra is the strongest free-to-scrape B2B SaaS review corpus we have
access to (G2 itself requires a $299+/mo subscription for legitimate API
access). The Apify actor we use accepts a search keyword directly and
returns matching products plus their reviews in a single call — cleaner
than the Trustpilot brand-discovery dance.

Cost (calibrated against settings defaults):
  ~6 products × 12 reviews/product × $0.006/page ≈ $0.05 per search.

Failure modes:
- No APIFY_API_TOKEN configured  → return [] (logged, pipeline continues).
- Apify call fails               → return [] (logged).
- Empty / malformed results      → return [] without crashing.
"""
import logging
from datetime import datetime, timezone

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings
from ..apify_client import run_actor_sync

logger = logging.getLogger(__name__)

# Keyword-searchable Capterra scraper with no monthly fee.
CAPTERRA_ACTOR_ID = "sovereigntaylor~capterra-scraper"


def _parse_iso(value) -> datetime | None:
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


def _first_str(d: dict, keys: tuple[str, ...]) -> str:
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def _review_to_post(review: dict, product_name: str, product_url: str | None) -> CollectedPost | None:
    """Normalize an Apify Capterra review row into our CollectedPost shape."""
    if not isinstance(review, dict):
        return None

    pros = _first_str(review, ("pros", "prosText"))
    cons = _first_str(review, ("cons", "consText"))
    overall = _first_str(review, ("overall", "comment", "review", "summary", "text"))
    parts = [p for p in (overall, f"Pros: {pros}" if pros else "", f"Cons: {cons}" if cons else "") if p]
    text = " ".join(parts).strip()
    if len(text) < 25:
        return None

    title = _first_str(review, ("title", "headline"))
    if product_name:
        title = f"[{product_name}] {title}".strip() if title else product_name

    author = _first_str(review, ("reviewerName", "author", "user", "name"))
    url = _first_str(review, ("reviewUrl", "url", "link")) or (product_url or "")

    ts = None
    for key in ("date", "publishedAt", "createdAt", "reviewDate"):
        ts = _parse_iso(review.get(key))
        if ts is not None:
            break

    return CollectedPost(
        source="capterra",
        title=title or None,
        text=text[:2000],
        author=author or None,
        url=url or None,
        timestamp=ts,
    )


class CapterraCollector(BaseCollector):
    """Collect Capterra reviews for B2B SaaS products in the niche."""

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        settings = get_settings()
        if not (settings.apify_api_token or "").strip():
            logger.info("Capterra collector skipped: APIFY_API_TOKEN not set.")
            return []

        max_products = max(1, settings.apify_capterra_max_results)
        reviews_per_product = max(1, settings.apify_capterra_reviews_per_product)
        # Generous Apify limit so we don't truncate before our own per-product
        # caps below; the scraper itself honours maxReviewsPerProduct.
        apify_limit = max_products * (reviews_per_product + 1) + 10

        actor_input = {
            "searchQuery": query.strip()[:160],
            "maxResults": max_products,
            "includeReviews": True,
            "maxReviewsPerProduct": reviews_per_product,
            "sortBy": "relevance",
            "proxyConfiguration": {"useApifyProxy": True},
        }
        rows = await run_actor_sync(
            CAPTERRA_ACTOR_ID,
            actor_input,
            limit=apify_limit,
            purpose=f"capterra:{query[:40]}",
        )
        if not rows:
            return []

        # The scraper emits one row per product, with reviews nested inside,
        # OR one row per review (varies by actor version). Handle both.
        posts: list[CollectedPost] = []
        for row in rows:
            if not isinstance(row, dict):
                continue

            # Product-shaped row with nested reviews.
            reviews = row.get("reviews")
            if isinstance(reviews, list) and reviews:
                product_name = _first_str(row, ("name", "productName", "title"))
                product_url = _first_str(row, ("url", "productUrl", "reviewsUrl"))
                for rv in reviews[:reviews_per_product]:
                    post = _review_to_post(rv, product_name, product_url)
                    if post is None:
                        continue
                    posts.append(post)
                    if len(posts) >= limit:
                        break
                if len(posts) >= limit:
                    break
                continue

            # Flat review-shaped row.
            product_name = _first_str(row, ("productName", "product"))
            product_url = _first_str(row, ("productUrl", "url"))
            post = _review_to_post(row, product_name, product_url or None)
            if post is None:
                continue
            posts.append(post)
            if len(posts) >= limit:
                break

        logger.info("Capterra collected %d review(s) for q=%r", len(posts), query)
        return posts[:limit]
