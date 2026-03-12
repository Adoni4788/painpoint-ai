"""
YouTube collector using the YouTube Data API v3.

Flow: search videos → filter by title/description heuristics → fetch comments → normalize to CollectedPost.
Prefers problem-oriented, troubleshooting, comparison, and help-seeking content.
"""
import logging
import re
from datetime import datetime
from typing import Optional

import httpx

from .base import BaseCollector, CollectedPost
from ...core.config import get_settings

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# Positive signals: problem-oriented, troubleshooting, comparison, help-seeking
POSITIVE_PHRASES = [
    "problem", "problems", "issue", "issues", "bug", "bugs", "broken", "doesn't work",
    "frustrated", "annoying", "fix", "solve", "workaround", "alternative", "instead of",
    " vs ", " versus ", "compared to", "switch from", "better than", "how do i",
    "why does", "can't figure out", "help with", "hate", "worst", "avoid", "don't use",
    "regret", "complaint", "complaints", "struggle", "struggling", "failed", "failure",
]

# Negative signals: deprioritize these videos
NEGATIVE_PHRASES = [
    "complete guide", "full course", "everything you need", "ultimate guide",
    "my favorite", "best of 20", "top 10", "you need this", "sponsored", "partner",
    "affiliate", "free trial", "sign up", "funny", "meme", "reaction", "challenge",
    "unboxing", "first look", "haul", "pr unboxing",
]

# Comment-level noise: exclude these
COMMENT_NOISE_PATTERNS = [
    r"^great video\s*\.?$",
    r"^awesome\s*\.?$",
    r"^nice\s*\.?$",
    r"^subscribed\s*\.?$",
    r"^first\s*\.?$",
    r"^second\s*\.?$",
    r"^thanks?\s*\.?$",
    r"^thank you\s*\.?$",
    r"^\+1\s*\.?$",
    r"^same\s*\.?$",
    r"^this\s*\.?$",
    r"^lol\s*\.?$",
    r"^lmao\s*\.?$",
]
COMMENT_NOISE_RE = re.compile("|".join(f"({p})" for p in COMMENT_NOISE_PATTERNS), re.I)


def _video_relevance_score(title: str, description: str) -> float:
    """
    Score 0-1 based on title/description. Higher = more likely to contain complaint-rich comments.
    """
    text = f"{title} {description}".lower()
    score = 0.5

    for phrase in POSITIVE_PHRASES:
        if phrase in text:
            score += 0.15
            if score >= 1.0:
                break

    for phrase in NEGATIVE_PHRASES:
        if phrase in text:
            score -= 0.35
            break

    return max(0.0, min(1.0, score))


def _should_skip_video(title: str) -> bool:
    """Exclude videos with blocklisted patterns in title."""
    t = title.lower()
    blocklist = ["unboxing", "first look", "sponsored", " ad ", "haul", "pr unboxing"]
    return any(b in t for b in blocklist)


def _is_valid_comment(text: str) -> bool:
    """Filter out short or low-signal comments."""
    if not text or len(text.strip()) < 25:
        return False
    if COMMENT_NOISE_RE.match(text.strip()):
        return False
    # Exclude mostly emoji or single repeated chars
    stripped = re.sub(r"[\s\W]+", "", text)
    if len(stripped) < 15:
        return False
    return True


def _parse_iso_date(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    except (ValueError, TypeError):
        return None


class YouTubeCollector(BaseCollector):
    """Collects comments from YouTube videos, preferring problem-oriented content."""

    MAX_VIDEOS_PER_QUERY = 8
    MAX_COMMENT_PAGES_PER_VIDEO = 2
    COMMENTS_PER_PAGE = 100

    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        posts: list[CollectedPost] = []
        settings = get_settings()

        if not settings.youtube_api_key:
            logger.warning("YOUTUBE_API_KEY not configured; skipping YouTube collection")
            return []

        params_base = {"key": settings.youtube_api_key}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                videos = await self._search_videos(client, query, params_base)
                if not videos:
                    logger.info(f"YouTube: no videos found for query '{query}'")
                    return []

                # Filter and rank by heuristics
                scored = []
                for v in videos:
                    title = v.get("title", "") or ""
                    desc = v.get("description", "") or ""
                    if _should_skip_video(title):
                        continue
                    score = _video_relevance_score(title, desc)
                    scored.append((score, v))

                scored.sort(key=lambda x: x[0], reverse=True)
                selected = [v for _, v in scored[: self.MAX_VIDEOS_PER_QUERY]]

                per_video = max(20, limit // len(selected))
                for video in selected:
                    if len(posts) >= limit:
                        break
                    video_id = video.get("id")
                    video_title = video.get("title", "Unknown")
                    video_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else None
                    batch = await self._fetch_comments(
                        client, video_id, video_title, video_url, per_video, params_base
                    )
                    for p in batch:
                        if len(posts) >= limit:
                            break
                        if p:
                            posts.append(p)

            except httpx.HTTPStatusError as e:
                logger.warning(
                    f"YouTube API HTTP error: {e.response.status_code} - {e.response.text[:200]}"
                )
            except Exception as e:
                logger.error(f"YouTube collection error: {e}")

        return posts[:limit]

    async def _search_videos(
        self, client: httpx.AsyncClient, query: str, params_base: dict
    ) -> list[dict]:
        """Search videos; return list of {id, title, description}."""
        try:
            url = f"{YOUTUBE_API_BASE}/search"
            params = {
                **params_base,
                "part": "snippet",
                "q": query,
                "type": "video",
                "videoDuration": "medium",  # exclude shorts
                "maxResults": 25,
            }
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            videos = []
            for item in data.get("items", []):
                vid = item.get("id", {})
                video_id = vid.get("videoId") if isinstance(vid, dict) else None
                if not video_id:
                    continue
                snippet = item.get("snippet", {})
                videos.append({
                    "id": video_id,
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:500],
                })
            return videos
        except Exception as e:
            logger.debug(f"YouTube search failed: {e}")
            return []

    async def _fetch_comments(
        self,
        client: httpx.AsyncClient,
        video_id: str,
        video_title: str,
        video_url: Optional[str],
        limit: int,
        params_base: dict,
    ) -> list[CollectedPost]:
        """Fetch comment threads for a video."""
        posts: list[CollectedPost] = []
        if not video_id:
            return posts

        try:
            url = f"{YOUTUBE_API_BASE}/commentThreads"
            page_token = None
            fetched = 0

            for _ in range(self.MAX_COMMENT_PAGES_PER_VIDEO):
                if fetched >= limit:
                    break
                params = {
                    **params_base,
                    "part": "snippet",
                    "videoId": video_id,
                    "textFormat": "plainText",
                    "maxResults": min(self.COMMENTS_PER_PAGE, limit - fetched),
                }
                if page_token:
                    params["pageToken"] = page_token

                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                for item in data.get("items", []):
                    top_comment = item.get("snippet", {}).get("topLevelComment", {})
                    top = top_comment.get("snippet", {})
                    text = (top.get("textDisplay") or top.get("textOriginal") or "").strip()
                    if not _is_valid_comment(text):
                        continue

                    author = top.get("authorDisplayName")
                    published = top.get("publishedAt")
                    comment_id = top_comment.get("id")
                    url_suffix = f"&lc={comment_id}" if comment_id else ""
                    comment_url = f"{video_url}{url_suffix}" if video_url else None

                    posts.append(
                        CollectedPost(
                            source="youtube",
                            title=video_title[:200] if video_title else None,
                            text=text[:2000],
                            author=author,
                            url=comment_url or video_url,
                            timestamp=_parse_iso_date(published),
                        )
                    )
                    fetched += 1
                    if fetched >= limit:
                        break

                page_token = data.get("nextPageToken")
                if not page_token:
                    break

        except httpx.HTTPStatusError as e:
            # Comments disabled, quota exceeded, etc.
            if e.response.status_code == 403:
                logger.debug(f"YouTube comments disabled or restricted for video {video_id}")
            else:
                logger.debug(f"YouTube comments fetch failed for {video_id}: {e}")
        except Exception as e:
            logger.debug(f"YouTube comments error for {video_id}: {e}")

        return posts
