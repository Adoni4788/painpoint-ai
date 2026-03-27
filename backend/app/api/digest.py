"""
Pain Point Digest — weekly newsletter engine.

Called by a Render cron job every Friday at 8 AM Jamaica time (1 PM UTC):
    POST /api/digest/send
    Headers: X-Digest-Secret: <DIGEST_SECRET>

Picks 3 niches per week (deterministic rotation of 24), runs the GapLens
pipeline on each, finds the top pain cluster, grabs the best quote, then
sends a transactional email via Loops to every subscribed contact.
"""

import asyncio
import logging
import uuid
from datetime import date, timezone, datetime

import httpx
from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select, desc

from ..core.config import get_settings
from ..core.database import async_session
from ..models.search import Search, PainCluster, RawPost
from ..services.pipeline import run_search_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/digest", tags=["digest"])
settings = get_settings()

# ---------------------------------------------------------------------------
# Niche rotation — 24 niches, 3 picked per week in a deterministic pattern.
# Week N picks indices: N%24, (N+8)%24, (N+16)%24
# ---------------------------------------------------------------------------
NICHES: list[str] = [
    "fitness tracking apps",
    "meal planning apps",
    "remote team collaboration tools",
    "language learning apps",
    "personal finance apps",
    "sleep tracking apps",
    "task management apps",
    "password managers",
    "email clients",
    "note-taking apps",
    "time tracking software",
    "project management tools",
    "customer support software",
    "invoicing tools for freelancers",
    "e-commerce analytics tools",
    "social media scheduling tools",
    "video editing software",
    "podcast recording apps",
    "online course platforms",
    "resume builders",
    "habit tracking apps",
    "meditation apps",
    "coding bootcamp platforms",
    "job board platforms",
]

DIGEST_SOURCES = ["reddit", "hackernews", "amazon"]
PIPELINE_TIMEOUT = 480  # 8 minutes per niche (3 niches = 24 min total; well within Render's 30-min cron limit)


def _pick_niches(iso_week: int) -> list[str]:
    return [
        NICHES[iso_week % 24],
        NICHES[(iso_week + 8) % 24],
        NICHES[(iso_week + 16) % 24],
    ]


# ---------------------------------------------------------------------------
# Loops helpers
# ---------------------------------------------------------------------------

async def _fetch_loops_contacts(client: httpx.AsyncClient) -> list[dict]:
    """Fetch all Loops contacts. Returns list of contact dicts."""
    contacts: list[dict] = []
    url = "https://app.loops.so/api/v1/contacts/list"
    while url:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        contacts.extend(data.get("contacts", []))
        url = data.get("nextPageUrl")  # pagination
    return contacts


async def _send_transactional(
    client: httpx.AsyncClient,
    email: str,
    template_id: str,
    data_variables: dict,
) -> bool:
    """Send one transactional email via Loops. Returns True on success."""
    try:
        resp = await client.post(
            "https://app.loops.so/api/v1/transactional",
            json={
                "transactionalId": template_id,
                "email": email,
                "dataVariables": data_variables,
            },
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("Loops transactional send failed for %s: %s", email, exc)
        return False


# ---------------------------------------------------------------------------
# Pipeline runner (with its own session, same pattern as routes.py)
# ---------------------------------------------------------------------------

async def _run_niche(niche: str) -> dict | None:
    """
    Run the full pipeline for one niche. Returns a dict with the top pain point
    data, or None if the pipeline failed / produced no clusters.
    """
    async with async_session() as db:
        # Create a search record owned by no user (digest searches)
        search = Search(
            query=niche,
            sources=DIGEST_SOURCES,
            user_id=None,
            workspace_id=None,
        )
        db.add(search)
        await db.commit()
        await db.refresh(search)
        search_id = search.id

        try:
            await asyncio.wait_for(
                run_search_pipeline(search_id, niche, DIGEST_SOURCES, db),
                timeout=PIPELINE_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.error("Digest pipeline timed out for niche %r (search %s)", niche, search_id)
            search = await db.get(Search, search_id)
            if search:
                search.status = "failed"
                await db.commit()
            return None
        except Exception as exc:
            logger.error("Digest pipeline error for niche %r: %s", niche, exc)
            return None

        # Grab the top cluster by opportunity_score
        result = await db.execute(
            select(PainCluster)
            .where(PainCluster.search_id == search_id)
            .order_by(desc(PainCluster.opportunity_score))
            .limit(1)
        )
        cluster = result.scalar_one_or_none()
        if not cluster:
            logger.warning("No clusters found for niche %r", niche)
            return None

        # Grab the best quote (highest authenticity_score, must be a complaint)
        quote_result = await db.execute(
            select(RawPost)
            .where(RawPost.cluster_id == cluster.id)
            .where(RawPost.is_complaint == True)  # noqa: E712
            .order_by(desc(RawPost.authenticity_score))
            .limit(1)
        )
        best_post = quote_result.scalar_one_or_none()
        quote_text = (best_post.text[:280] if best_post and best_post.text else "")
        quote_source = best_post.source if best_post else "community"

        return {
            "niche": niche,
            "pain_label": cluster.label,
            "pain_summary": cluster.summary or "",
            "opportunity_score": round(cluster.opportunity_score, 1),
            "complaint_count": cluster.complaint_count,
            "suggested_solution": cluster.suggested_solution or "",
            "quote": quote_text,
            "quote_source": quote_source,
        }


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/send")
async def send_digest(x_digest_secret: str = Header(default="")):
    """
    Trigger the weekly Pain Point Digest send.
    Called by Render cron. Requires X-Digest-Secret header.
    """
    if not settings.digest_secret or x_digest_secret != settings.digest_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid digest secret")

    if not settings.loops_api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Loops API key not configured")

    if not settings.loops_digest_template_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Loops digest template ID not configured")

    iso_week = date.today().isocalendar().week
    niches = _pick_niches(iso_week)
    logger.info("Digest week=%d niches=%s", iso_week, niches)

    # Run all 3 pipelines (sequentially to avoid DB contention on free-tier Render)
    niche_results: list[dict] = []
    for niche in niches:
        result = await _run_niche(niche)
        if result:
            niche_results.append(result)

    if not niche_results:
        logger.error("All niche pipelines failed for digest week %d", iso_week)
        return {"status": "failed", "reason": "All pipelines failed", "week": iso_week}

    # Build Loops data variables (supports up to 3 niches; missing ones get empty strings)
    def _niche_vars(idx: int, data: dict | None) -> dict:
        prefix = f"niche{idx + 1}_"
        if not data:
            return {f"{prefix}{k}": "" for k in ["label", "summary", "score", "count", "solution", "quote", "source"]}
        return {
            f"{prefix}label": data["pain_label"],
            f"{prefix}summary": data["pain_summary"],
            f"{prefix}score": str(data["opportunity_score"]),
            f"{prefix}count": str(data["complaint_count"]),
            f"{prefix}solution": data["suggested_solution"],
            f"{prefix}quote": data["quote"],
            f"{prefix}source": data["quote_source"],
        }

    data_variables: dict = {"week": str(iso_week), "send_date": datetime.now(timezone.utc).strftime("%B %d, %Y")}
    for i in range(3):
        data_variables.update(_niche_vars(i, niche_results[i] if i < len(niche_results) else None))

    # Fetch subscribers and send
    headers = {
        "Authorization": f"Bearer {settings.loops_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        try:
            contacts = await _fetch_loops_contacts(client)
        except Exception as exc:
            logger.error("Failed to fetch Loops contacts: %s", exc)
            return {"status": "failed", "reason": f"Loops contacts fetch failed: {exc}", "week": iso_week}

        subscribed = [c for c in contacts if c.get("subscribed", True) and c.get("email")]
        logger.info("Sending digest to %d subscribers", len(subscribed))

        delivered = 0
        for contact in subscribed:
            ok = await _send_transactional(
                client,
                contact["email"],
                settings.loops_digest_template_id,
                data_variables,
            )
            if ok:
                delivered += 1

    logger.info(
        "Digest complete week=%d delivered=%d/%d niches=%d",
        iso_week, delivered, len(subscribed), len(niche_results),
    )

    return {
        "status": "ok",
        "week": iso_week,
        "niches": [r["niche"] for r in niche_results],
        "subscribers": len(subscribed),
        "delivered": delivered,
        "pain_points": [
            {"niche": r["niche"], "label": r["pain_label"], "score": r["opportunity_score"]}
            for r in niche_results
        ],
    }
