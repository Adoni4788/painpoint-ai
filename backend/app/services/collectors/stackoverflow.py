"""
Stack Overflow collector — mines unresolved / low-score questions and their
top answers from the Stack Exchange API. This is the cleanest source of
pain for developer-tool niches: the question body is *literally* "this
thing doesn't work, here's exactly what I tried, here's the error."

API: https://api.stackexchange.com/docs/advanced-search
- Free tier: 300 req/IP/day without an app key, 10K/day with one.
- A Stack Exchange "key" is just an unauth identifier — no OAuth needed
  for read endpoints.
"""
import re
import logging
from datetime import datetime, timezone

import httpx

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def _strip_html(html: str) -> str:
    """Drop HTML tags and collapse whitespace. SE returns escaped HTML in
    `body` and `body_markdown` fields — body_markdown is preferable but not
    always populated."""
    if not html:
        return ""
    text = _HTML_TAG_RE.sub(" ", html)
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    return _WHITESPACE_RE.sub(" ", text).strip()


def _utc_from_ts(ts: float | int | None) -> datetime | None:
    """Convert a unix timestamp to a naive UTC datetime (matches DB column type)."""
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)


class StackOverflowCollector(BaseCollector):
    """Collect questions (and high-signal answers) from Stack Overflow."""

    BASE_URL = "https://api.stackexchange.com/2.3"
    SITE = "stackoverflow"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()

        # SE returns relevance-sorted question hits with bodies when filter=withbody.
        page_size = min(50, max(10, limit))
        common_params: dict[str, str | int] = {
            "site": self.SITE,
            "order": "desc",
            "sort": "relevance",
            "pagesize": page_size,
            "filter": "withbody",
        }
        if settings.stackexchange_key:
            common_params["key"] = settings.stackexchange_key

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/search/advanced",
                    params={**common_params, "q": query},
                )
                # SE responds with quota in body even on 200; honor explicit errors only.
                if resp.status_code == 400:
                    logger.warning(
                        "Stack Overflow 400 for q=%r: %s", query, resp.text[:200]
                    )
                    return []
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                logger.warning(
                    "Stack Overflow HTTP %s for q=%r", e.response.status_code, query
                )
                return []
            except Exception as e:
                logger.error("Stack Overflow collection error for q=%r: %s", query, e)
                return []

            # Backoff signal — SE returns "backoff: N" when we should pause.
            if data.get("backoff"):
                logger.info("Stack Overflow asked for backoff=%s", data.get("backoff"))

            for item in data.get("items", []):
                title = item.get("title") or ""
                body = _strip_html(item.get("body") or "")
                # Surface unresolved / unsatisfying questions — they're the
                # pain-richest. Bias slightly but don't hard-filter, since the
                # downstream LLM relevance/complaint check is the real filter.
                if not body and not title:
                    continue
                text = f"{title}. {body}".strip() if body else title
                if len(text) < 30:
                    continue

                owner = (item.get("owner") or {}).get("display_name")
                posts.append(
                    CollectedPost(
                        source="stackoverflow",
                        title=title or None,
                        text=text[:2000],
                        author=owner,
                        url=item.get("link"),
                        timestamp=_utc_from_ts(item.get("creation_date")),
                    )
                )

                if len(posts) >= limit:
                    break

        return posts[:limit]
