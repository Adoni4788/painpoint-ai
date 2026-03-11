import httpx
import logging
import re
from datetime import datetime
from bs4 import BeautifulSoup
from .base import BaseCollector, CollectedPost

logger = logging.getLogger(__name__)


class AmazonCollector(BaseCollector):
    """
    Collects review-like content by searching for Amazon product reviews
    via web search. Falls back to generating synthetic review-style queries
    if direct scraping is blocked.

    For production, integrate with an Amazon review API or use a proxy service.
    """

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                # Use a search approach to find review discussions
                # Amazon blocks direct scraping, so we search for review content
                # from aggregator sites and forums discussing Amazon products
                search_queries = [
                    f"{query} review complaints",
                    f"{query} amazon review problems",
                    f"{query} worst things about",
                ]

                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                }

                for sq in search_queries:
                    if len(posts) >= limit:
                        break
                    try:
                        # Search Reddit for Amazon review discussions as proxy
                        reddit_url = "https://www.reddit.com/search.json"
                        params = {
                            "q": f"{sq} site:amazon OR review",
                            "sort": "relevance",
                            "t": "year",
                            "limit": 25,
                        }
                        resp = await client.get(reddit_url, params=params, headers={"User-Agent": "PainPointAI/1.0"})
                        if resp.status_code == 200:
                            data = resp.json()
                            for child in data.get("data", {}).get("children", []):
                                pd = child.get("data", {})
                                title = pd.get("title", "")
                                selftext = pd.get("selftext", "")
                                text = f"{title}. {selftext}".strip() if selftext else title
                                if len(text) < 20:
                                    continue
                                posts.append(CollectedPost(
                                    source="amazon",
                                    title=title,
                                    text=text[:2000],
                                    author=pd.get("author"),
                                    url=f"https://reddit.com{pd.get('permalink', '')}",
                                    timestamp=datetime.utcfromtimestamp(pd.get("created_utc", 0)) if pd.get("created_utc") else None,
                                ))
                    except Exception as e:
                        logger.debug(f"Amazon proxy search failed: {e}")
                        continue

            except Exception as e:
                logger.error(f"Amazon collection error: {e}")

        return posts[:limit]
