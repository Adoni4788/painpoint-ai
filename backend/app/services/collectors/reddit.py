import httpx
import logging
from datetime import datetime, timezone
from .base import BaseCollector, CollectedPost
from ...core.config import get_settings


def _utc_from_ts(ts: float | int | None) -> datetime | None:
    """Convert a unix timestamp to a naive UTC datetime (matches DB column type)."""
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)

logger = logging.getLogger(__name__)


class RedditCollector(BaseCollector):
    """Collects posts and comments from Reddit's public JSON API."""

    BASE_URL = "https://www.reddit.com"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()

        headers = {"User-Agent": settings.reddit_user_agent}

        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            try:
                search_url = f"{self.BASE_URL}/search.json"
                params = {
                    "q": query,
                    "sort": "relevance",
                    "t": "year",
                    "limit": min(limit, 100),
                    "type": "link",
                }
                resp = await client.get(search_url, params=params)
                resp.raise_for_status()
                data = resp.json()

                for child in data.get("data", {}).get("children", []):
                    post_data = child.get("data", {})
                    title = post_data.get("title", "")
                    selftext = post_data.get("selftext", "")
                    text = f"{title}. {selftext}".strip() if selftext else title

                    if len(text) < 20:
                        continue

                    posts.append(CollectedPost(
                        source="reddit",
                        title=title,
                        text=text[:2000],
                        author=post_data.get("author"),
                        url=f"https://reddit.com{post_data.get('permalink', '')}",
                        timestamp=_utc_from_ts(post_data.get("created_utc")),
                    ))

                    # Only fetch comments for larger searches (not subtopic micro-searches)
                    if limit >= 25 and len(posts) < limit:
                        await self._fetch_comments(client, post_data.get("permalink", ""), posts, limit - len(posts))

            except httpx.HTTPStatusError as e:
                logger.warning("Reddit API HTTP error: %s", e.response.status_code)
            except Exception as e:
                logger.error("Reddit collection error: %s", e)

        return posts[:limit]

    async def _fetch_comments(self, client: httpx.AsyncClient, permalink: str, posts: list[CollectedPost], remaining: int):
        if not permalink or remaining <= 0:
            return
        try:
            url = f"{self.BASE_URL}{permalink}.json"
            resp = await client.get(url, params={"limit": 10, "sort": "top"})
            resp.raise_for_status()
            data = resp.json()

            if len(data) < 2:
                return

            for child in data[1].get("data", {}).get("children", [])[:10]:
                if child.get("kind") != "t1":
                    continue
                comment = child.get("data", {})
                body = comment.get("body", "")
                if len(body) < 20:
                    continue

                posts.append(CollectedPost(
                    source="reddit",
                    title=None,
                    text=body[:2000],
                    author=comment.get("author"),
                    url=f"https://reddit.com{permalink}",
                    timestamp=_utc_from_ts(comment.get("created_utc")),
                ))

                if len(posts) >= remaining:
                    break
        except Exception as e:
            logger.debug("Failed to fetch Reddit comments: %s", e)
