"""
G2 collector using the official G2 API.

Requires G2_API_KEY from https://www.g2.com/static/integrations.
Flow: search products by name → fetch reviews via Syndication API → normalize to CollectedPost.
"""
import logging
from datetime import datetime
from typing import Any

import httpx

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings

logger = logging.getLogger(__name__)

G2_API_BASE = "https://data.g2.com/api"
G2_SYNDICATION_BASE = "https://data.g2.com/api/2018-01-01"


def _normalize_review(attrs: dict, product_name: str) -> CollectedPost | None:
    """
    Combine G2 review fields into CollectedPost.
    Prioritizes complaint-rich sections: hate (cons), then recommendations, love (pros), benefits.
    """
    answers = attrs.get("answers") or {}
    parts = []

    # Cons / dislikes - highest complaint signal
    hate = answers.get("hate") or {}
    if isinstance(hate, dict) and hate.get("value"):
        parts.append(f"[Cons] {hate['value']}")
    elif isinstance(hate, str):
        parts.append(f"[Cons] {hate}")

    # Recommendations - often contain improvement suggestions
    recs = answers.get("recommendations") or {}
    if isinstance(recs, dict) and recs.get("value"):
        parts.append(f"[Recommendations] {recs['value']}")
    elif isinstance(recs, str):
        parts.append(f"[Recommendations] {recs}")

    # Pros - context for balance
    love = answers.get("love") or {}
    if isinstance(love, dict) and love.get("value"):
        parts.append(f"[Pros] {love['value']}")
    elif isinstance(love, str):
        parts.append(f"[Pros] {love}")

    # Benefits - less complaint-focused
    benefits = answers.get("benefits") or {}
    if isinstance(benefits, dict) and benefits.get("value"):
        parts.append(f"[Benefits] {benefits['value']}")
    elif isinstance(benefits, str):
        parts.append(f"[Benefits] {benefits}")

    text = " ".join(parts).strip()
    if len(text) < 20:
        return None

    title = attrs.get("title") or f"Review of {product_name}"
    user = attrs.get("user") or {}
    author = user.get("name") if isinstance(user, dict) else None
    url = attrs.get("url")
    submitted = attrs.get("submitted_at") or attrs.get("published_at") or attrs.get("user_updated_at")

    ts = None
    if submitted:
        try:
            ts = datetime.fromisoformat(str(submitted).replace("Z", "+00:00"))
            if ts.tzinfo:
                ts = ts.replace(tzinfo=None)
        except (ValueError, TypeError):
            pass

    return CollectedPost(
        source="g2",
        title=title[:500] if title else None,
        text=text[:2000],
        author=author,
        url=url,
        timestamp=ts,
    )


class G2Collector(BaseCollector):
    """Collects B2B software reviews from G2 via the official API."""

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()

        if not settings.g2_api_key:
            logger.warning("G2_API_KEY not configured; skipping G2 collection")
            return []

        headers = {
            "Authorization": f"Token token={settings.g2_api_key}",
            "Content-Type": "application/vnd.api+json",
            "Version": "HTTP/1.0",
        }

        async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
            try:
                product_ids = await self._search_products(client, query, limit)
                if not product_ids:
                    logger.info(f"G2: no products found for query '{query}'")
                    return []

                per_product = max(5, limit // len(product_ids))
                for pid in product_ids[:10]:
                    if len(posts) >= limit:
                        break
                    batch = await self._fetch_reviews(client, pid, per_product)
                    for p in batch:
                        if len(posts) >= limit:
                            break
                        if p:
                            posts.append(p)
            except httpx.HTTPStatusError as e:
                logger.warning(f"G2 API HTTP error: {e.response.status_code} - {e.response.text[:200]}")
            except Exception as e:
                logger.error(f"G2 collection error: {e}")

        return posts[:limit]

    async def _search_products(self, client: httpx.AsyncClient, query: str, limit: int) -> list[str]:
        """Search products by name, return list of product UUIDs."""
        ids: list[str] = []
        try:
            url = f"{G2_API_BASE}/v1/products"
            params = {"filter[name]": query, "page[size]": min(20, limit)}
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("data", []):
                pid = item.get("id")
                if pid:
                    ids.append(pid)
        except Exception as e:
            logger.debug(f"G2 product search failed: {e}")
        return ids

    async def _fetch_reviews(
        self, client: httpx.AsyncClient, product_id: str, per_product: int
    ) -> list[CollectedPost]:
        """Fetch reviews for a product via Syndication API."""
        posts: list[CollectedPost] = []
        try:
            url = f"{G2_SYNDICATION_BASE}/syndication/reviews"
            params = {"filter[product_id]": product_id, "page[size]": min(100, per_product)}
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            product_name = "Unknown"
            meta = data.get("meta") or {}
            prod = meta.get("product") or {}
            if isinstance(prod, dict):
                product_name = prod.get("name") or product_name

            for item in data.get("data", []):
                attrs = item.get("attributes") or {}
                if isinstance(attrs, dict):
                    pname = attrs.get("product_name") or product_name
                    post = _normalize_review(attrs, pname)
                    if post:
                        posts.append(post)
        except Exception as e:
            logger.debug(f"G2 reviews fetch failed for {product_id}: {e}")
        return posts
