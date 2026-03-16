import httpx
import logging
from datetime import datetime
from .base import BaseCollector, CollectedPost
from ...core.config import get_settings

logger = logging.getLogger(__name__)


class FacebookCollector(BaseCollector):
    """
    Collects Facebook-related complaints and pain points via Reddit as a proxy.

    Facebook/Meta does not offer a public API for searching posts or comments.
    The Meta Content Library API is restricted to academic researchers.
    This collector mines Reddit for discussions about Facebook (complaints,
    frustrations, feature requests) to surface Facebook-related pain points.
    """

    BASE_URL = "https://www.reddit.com"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()
        headers = {"User-Agent": settings.reddit_user_agent}

        search_queries = [
            f"{query} facebook complaints",
            f"{query} facebook problems",
            f"{query} facebook frustrating",
            f"{query} facebook sucks",
        ]

        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            try:
                for sq in search_queries:
                    if len(posts) >= limit:
                        break
                    try:
                        params = {
                            "q": sq,
                            "sort": "relevance",
                            "t": "year",
                            "limit": min(25, limit - len(posts)),
                            "type": "link",
                        }
                        resp = await client.get(
                            f"{self.BASE_URL}/search.json",
                            params=params,
                        )
                        resp.raise_for_status()
                        data = resp.json()

                        for child in data.get("data", {}).get("children", []):
                            pd = child.get("data", {})
                            title = pd.get("title", "")
                            selftext = pd.get("selftext", "")
                            text = f"{title}. {selftext}".strip() if selftext else title

                            if len(text) < 20:
                                continue

                            posts.append(
                                CollectedPost(
                                    source="facebook",
                                    title=title,
                                    text=text[:2000],
                                    author=pd.get("author"),
                                    url=f"https://reddit.com{pd.get('permalink', '')}",
                                    timestamp=(
                                        datetime.utcfromtimestamp(pd.get("created_utc", 0))
                                        if pd.get("created_utc")
                                        else None
                                    ),
                                )
                            )

                            if len(posts) >= limit:
                                break
                    except httpx.HTTPStatusError as e:
                        logger.debug(f"Facebook proxy search HTTP error: {e.response.status_code}")
                    except Exception as e:
                        logger.debug(f"Facebook proxy search failed: {e}")

            except Exception as e:
                logger.error(f"Facebook collection error: {e}")

        return posts[:limit]
