import re
import httpx
import logging
from datetime import datetime
from .base import BaseCollector, CollectedPost

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


class HackerNewsCollector(BaseCollector):
    """Collects stories and comments from the Hacker News Algolia API."""

    SEARCH_URL = "https://hn.algolia.com/api/v1/search"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Stories
                resp = await client.get(
                    self.SEARCH_URL,
                    params={"query": query, "tags": "story", "hitsPerPage": min(limit // 2, 50)},
                )
                resp.raise_for_status()
                for hit in resp.json().get("hits", []):
                    title = hit.get("title", "")
                    text = hit.get("story_text") or title
                    if len(text) < 15:
                        continue
                    posts.append(CollectedPost(
                        source="hackernews",
                        title=title,
                        text=text[:2000],
                        author=hit.get("author"),
                        url=(
                            hit.get("url")
                            or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
                        ),
                        timestamp=(
                            datetime.fromisoformat(hit["created_at"].replace("Z", "+00:00"))
                            if hit.get("created_at") else None
                        ),
                    ))

                # Comments (richer complaint signal)
                resp2 = await client.get(
                    self.SEARCH_URL,
                    params={"query": query, "tags": "comment", "hitsPerPage": min(limit // 2, 50)},
                )
                resp2.raise_for_status()
                for hit in resp2.json().get("hits", []):
                    raw = hit.get("comment_text", "")
                    clean = _HTML_TAG_RE.sub(" ", raw).strip()
                    if len(clean) < 20:
                        continue
                    posts.append(CollectedPost(
                        source="hackernews",
                        title=None,
                        text=clean[:2000],
                        author=hit.get("author"),
                        url=f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                        timestamp=(
                            datetime.fromisoformat(hit["created_at"].replace("Z", "+00:00"))
                            if hit.get("created_at") else None
                        ),
                    ))

            except httpx.HTTPStatusError as e:
                logger.warning("HN API HTTP error: %s", e.response.status_code)
            except Exception as e:
                logger.error("HN collection error: %s", e)

        return posts[:limit]
