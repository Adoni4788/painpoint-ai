import httpx
import asyncio
import logging
from datetime import datetime
from .base import BaseCollector, CollectedPost

logger = logging.getLogger(__name__)


class HackerNewsCollector(BaseCollector):
    """Collects stories and comments from the Hacker News Algolia API."""

    SEARCH_URL = "https://hn.algolia.com/api/v1/search"
    ITEM_URL = "https://hn.algolia.com/api/v1/items"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Search stories
                params = {
                    "query": query,
                    "tags": "story",
                    "hitsPerPage": min(limit // 2, 50),
                }
                resp = await client.get(self.SEARCH_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

                story_ids = []
                for hit in data.get("hits", []):
                    title = hit.get("title", "")
                    text = hit.get("story_text") or title
                    if len(text) < 15:
                        continue

                    posts.append(CollectedPost(
                        source="hackernews",
                        title=title,
                        text=text[:2000],
                        author=hit.get("author"),
                        url=hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                        timestamp=datetime.fromisoformat(hit["created_at"].replace("Z", "+00:00")) if hit.get("created_at") else None,
                    ))
                    story_ids.append(hit.get("objectID"))

                # Search comments for richer complaint data
                params_comments = {
                    "query": query,
                    "tags": "comment",
                    "hitsPerPage": min(limit // 2, 50),
                }
                resp2 = await client.get(self.SEARCH_URL, params=params_comments)
                resp2.raise_for_status()
                data2 = resp2.json()

                for hit in data2.get("hits", []):
                    text = hit.get("comment_text", "")
                    if len(text) < 20:
                        continue
                    # Strip HTML tags
                    import re
                    clean = re.sub(r"<[^>]+>", " ", text).strip()
                    if len(clean) < 20:
                        continue

                    posts.append(CollectedPost(
                        source="hackernews",
                        title=None,
                        text=clean[:2000],
                        author=hit.get("author"),
                        url=f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                        timestamp=datetime.fromisoformat(hit["created_at"].replace("Z", "+00:00")) if hit.get("created_at") else None,
                    ))

            except httpx.HTTPStatusError as e:
                logger.warning(f"HN API HTTP error: {e.response.status_code}")
            except Exception as e:
                logger.error(f"HN collection error: {e}")

        return posts[:limit]
