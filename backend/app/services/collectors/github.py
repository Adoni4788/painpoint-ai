"""
GitHub Issues collector — mines public-repo issues that mention the niche
keyword(s). For developer-tooling niches this is the highest-signal source
on the internet: issues are bug reports, feature gaps, and "this is broken"
threads, all with reaction counts that surface community-felt pain.

API: https://docs.github.com/en/rest/search/search#search-issues-and-pull-requests
- Free unauth: 10 req/min (very tight). With a token: 30 req/min.
- We use search/issues with type:issue + is:public to skip PRs and private.
- Sort by reactions to surface community-validated pain first.
"""
import logging
from datetime import datetime

import httpx

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings

logger = logging.getLogger(__name__)


class GitHubIssuesCollector(BaseCollector):
    """Collect public-repo GitHub issues whose title/body match the query."""

    SEARCH_URL = "https://api.github.com/search/issues"

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": settings.reddit_user_agent or "PainPointAI/1.0",
        }
        token = (settings.github_token or "").strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        # Restrict to issues (not PRs), public repos, recent enough to matter.
        # Sorting by reactions surfaces the issues a community has *agreed* are
        # painful, which is a much stronger signal than recency.
        q = f"{query} is:issue is:public"
        params = {
            "q": q,
            "sort": "reactions",
            "order": "desc",
            "per_page": min(50, max(10, limit)),
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(self.SEARCH_URL, params=params, headers=headers)
                # 422 from GH usually means the query string is malformed; treat
                # as empty result rather than a hard failure.
                if resp.status_code == 422:
                    logger.warning(
                        "GitHub search rejected query=%r: %s", q, resp.text[:200]
                    )
                    return []
                # 403 with X-RateLimit-Remaining: 0 = quota burned for the window.
                if resp.status_code == 403:
                    remaining = resp.headers.get("X-RateLimit-Remaining")
                    logger.warning(
                        "GitHub 403 (rate limit?). remaining=%s for q=%r",
                        remaining, q,
                    )
                    return []
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                logger.warning(
                    "GitHub Issues HTTP %s for q=%r", e.response.status_code, q
                )
                return []
            except Exception as e:
                logger.error("GitHub Issues collection error for q=%r: %s", q, e)
                return []

            for item in data.get("items", []):
                title = item.get("title") or ""
                body = (item.get("body") or "").strip()
                if not (title or body):
                    continue
                text = f"{title}. {body}".strip() if body else title
                if len(text) < 30:
                    continue

                created = item.get("created_at")
                ts: datetime | None = None
                if created:
                    try:
                        ts = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        if ts.tzinfo is not None:
                            ts = ts.replace(tzinfo=None)
                    except ValueError:
                        ts = None

                user = (item.get("user") or {}).get("login")

                posts.append(
                    CollectedPost(
                        source="github",
                        title=title or None,
                        text=text[:2000],
                        author=user,
                        url=item.get("html_url"),
                        timestamp=ts,
                    )
                )

                if len(posts) >= limit:
                    break

        return posts[:limit]
