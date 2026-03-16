import httpx
import logging
from datetime import datetime
from .base import BaseCollector, CollectedPost

logger = logging.getLogger(__name__)


class AmazonCollector(BaseCollector):
    """
    Collects Amazon-related review discussions by searching Reddit for posts
    that discuss Amazon product reviews, complaints, and problems.

    NOTE: This collector returns Reddit posts (source="reddit") — it does NOT
    scrape Amazon directly (Amazon blocks it). The posts are Reddit discussions
    about Amazon products, which contain authentic review-style complaints.

    TODO: For true Amazon review data, integrate Rainforest API, SERP API, or
    Apify Amazon scraper and change source to "amazon" at that point.
    """

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []

        search_queries = [
            f"{query} review complaints",
            f"{query} amazon review problems",
            f"{query} worst things about",
        ]

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                for sq in search_queries:
                    if len(posts) >= limit:
                        break
                    try:
                        resp = await client.get(
                            "https://www.reddit.com/search.json",
                            params={
                                "q": f"{sq} site:amazon OR review",
                                "sort": "relevance",
                                "t": "year",
                                "limit": 25,
                            },
                            headers={"User-Agent": "PainPointAI/1.0"},
                        )
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
                                    # source="reddit" because this IS Reddit data.
                                    # When a real Amazon API is integrated, change to "amazon".
                                    source="reddit",
                                    title=title,
                                    text=text[:2000],
                                    author=pd.get("author"),
                                    url=f"https://reddit.com{pd.get('permalink', '')}",
                                    timestamp=(
                                        datetime.utcfromtimestamp(pd.get("created_utc", 0))
                                        if pd.get("created_utc") else None
                                    ),
                                ))
                    except Exception as e:
                        logger.debug("Amazon proxy search failed: %s", e)
                        continue

            except Exception as e:
                logger.error("Amazon collection error: %s", e)

        return posts[:limit]
