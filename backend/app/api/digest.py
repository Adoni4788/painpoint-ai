"""
Pain Point Digest — automated weekly newsletter engine.

Triggered every Friday by a Render cron job:
  POST /api/digest/send
  Header: X-Digest-Secret: <DIGEST_SECRET>

Flow:
  1. Pick 3 niches from a 24-item rotation list (deterministic by ISO week number)
  2. Run the full GapLens pipeline on each niche (Reddit + HackerNews + Amazon)
  3. Pull the top PainCluster (by opportunity_score) and best RawPost quote for each
  4. Fetch all Loops subscribers
  5. Send a transactional email to each subscriber via the Loops API
"""
import asyncio
import datetime
import logging
import uuid

import httpx
from fastapi import APIRouter, Header, HTTPException
from sqlalchemy import select, desc

from ..core.config import get_settings
from ..core.database import async_session
from ..models.search import Search, PainCluster, RawPost
from ..services.pipeline import run_search_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# ---------------------------------------------------------------------------
# 24-niche rotation list — one full rotation every 8 weeks (3 niches/week)
# ---------------------------------------------------------------------------
NICHES = [
    "fitness tracking apps",
    "cold email software",
    "project management tools",
    "meal planning apps",
    "remote work collaboration tools",
    "personal finance apps",
    "language learning apps",
    "sleep tracking wearables",
    "habit tracking apps",
    "freelance invoicing software",
    "social media scheduling tools",
    "note-taking apps",
    "online course platforms",
    "password manager apps",
    "recipe apps",
    "job board platforms",
    "resume builder tools",
    "time tracking software",
    "podcast apps",
    "email newsletter platforms",
    "customer support software",
    "appointment scheduling apps",
    "expense tracking apps",
    "video editing software",
]

SOURCES = ["reddit", "hackernews", "amazon"]
LOOPS_API = "https://app.loops.so/api/v1"


def _pick_niches_for_week(iso_week: int, count: int = 3) -> list[str]:
    """
    Deterministically pick `count` niches for the given ISO week number.
    Rotates through the full list so every niche appears roughly equally.
    """
    offset = (iso_week * count) % len(NICHES)
    indices = [(offset + i) % len(NICHES) for i in range(count)]
    return [NICHES[i] for i in indices]


async def _run_pipeline_for_niche(niche: str) -> dict | None:
    """
    Create a Search record, run the full pipeline, and return digest data.
    Returns None if no clusters were found.
    """
    async with async_session() as db:
        search = Search(
            id=uuid.uuid4(),
            query=niche,
            sources=SOURCES,
            status="pending",
        )
        db.add(search)
        await db.commit()
        search_id = search.id

    # Run pipeline in its own session (pipeline manages its own commits)
    async with async_session() as db:
        await run_search_pipeline(search_id, niche, SOURCES, db)

    # Pull results
    async with async_session() as db:
        # Top cluster by opportunity_score
        result = await db.execute(
            select(PainCluster)
            .where(PainCluster.search_id == search_id)
            .order_by(desc(PainCluster.opportunity_score))
            .limit(1)
        )
        cluster = result.scalar_one_or_none()

        if not cluster:
            logger.warning("No clusters found for niche: %s", niche)
            return None

        # Best quote from posts in this cluster
        post_result = await db.execute(
            select(RawPost)
            .where(
                RawPost.cluster_id == cluster.id,
                RawPost.is_complaint == True,  # noqa: E712
                RawPost.text != "",
            )
            .order_by(desc(RawPost.authenticity_score))
            .limit(1)
        )
        top_post = post_result.scalar_one_or_none()

        quote = ""
        quote_source = ""
        if top_post:
            # Trim quote to ~280 chars for readability in email
            raw_text = top_post.text or ""
            quote = raw_text[:280].strip()
            if len(raw_text) > 280:
                quote += "…"
            quote_source = top_post.source or ""

        return {
            "label": cluster.label or niche,
            "summary": cluster.summary or "",
            "score": round(cluster.opportunity_score, 1),
            "count": cluster.complaint_count,
            "solution": cluster.suggested_solution or "",
            "quote": quote,
            "source": quote_source,
        }


async def _fetch_loops_subscribers() -> list[str]:
    """
    Fetch all contact emails from Loops using the /contacts endpoint.
    Loops returns paginated results — iterate until exhausted.
    """
    emails: list[str] = []
    headers = {"Authorization": f"Bearer {settings.loops_api_key}"}

    async with httpx.AsyncClient(timeout=30) as client:
        page = 1
        while True:
            resp = await client.get(
                f"{LOOPS_API}/contacts",
                headers=headers,
                params={"page": page, "limit": 100},
            )
            if resp.status_code != 200:
                logger.error("Loops contacts fetch failed: %s %s", resp.status_code, resp.text)
                break

            data = resp.json()
            contacts = data if isinstance(data, list) else data.get("data", [])

            if not contacts:
                break

            for contact in contacts:
                email = contact.get("email", "")
                if email:
                    emails.append(email)

            # Loops returns fewer than limit when on the last page
            if len(contacts) < 100:
                break

            page += 1

    return emails


async def _send_digest_email(
    email: str,
    week: int,
    send_date: str,
    niches: list[dict],
    client: httpx.AsyncClient,
) -> bool:
    """Send a single transactional digest email via Loops."""
    if len(niches) < 3:
        return False

    payload = {
        "transactionalId": settings.loops_digest_template_id,
        "email": email,
        "dataVariables": {
            "week": str(week),
            "send_date": send_date,
            # Niche 1
            "niche1_label": niches[0]["label"],
            "niche1_summary": niches[0]["summary"],
            "niche1_score": str(niches[0]["score"]),
            "niche1_count": str(niches[0]["count"]),
            "niche1_solution": niches[0]["solution"],
            "niche1_quote": niches[0]["quote"],
            "niche1_source": niches[0]["source"],
            # Niche 2
            "niche2_label": niches[1]["label"],
            "niche2_summary": niches[1]["summary"],
            "niche2_score": str(niches[1]["score"]),
            "niche2_count": str(niches[1]["count"]),
            "niche2_solution": niches[1]["solution"],
            "niche2_quote": niches[1]["quote"],
            "niche2_source": niches[1]["source"],
            # Niche 3
            "niche3_label": niches[2]["label"],
            "niche3_summary": niches[2]["summary"],
            "niche3_score": str(niches[2]["score"]),
            "niche3_count": str(niches[2]["count"]),
            "niche3_solution": niches[2]["solution"],
            "niche3_quote": niches[2]["quote"],
            "niche3_source": niches[2]["source"],
        },
    }

    try:
        resp = await client.post(
            f"{LOOPS_API}/transactional",
            headers={
                "Authorization": f"Bearer {settings.loops_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            return True
        logger.warning("Loops send failed for %s: %s %s", email, resp.status_code, resp.text)
        return False
    except Exception as e:
        logger.error("Loops send exception for %s: %s", email, e)
        return False


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/digest/send")
async def send_digest(x_digest_secret: str = Header(default="")):
    """
    Trigger the weekly Pain Point Digest send.
    Called by Render cron job every Friday at 8am Jamaica time (1pm UTC).
    Protected by X-Digest-Secret header.
    """
    # --- Auth ---
    if not settings.digest_secret or x_digest_secret != settings.digest_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing digest secret")

    if not settings.loops_api_key:
        raise HTTPException(status_code=503, detail="LOOPS_API_KEY not configured")

    if not settings.loops_digest_template_id:
        raise HTTPException(status_code=503, detail="LOOPS_DIGEST_TEMPLATE_ID not configured")

    # --- Pick niches for this week ---
    today = datetime.date.today()
    iso_week = today.isocalendar().week
    send_date = today.strftime("%B %d, %Y")
    selected_niches = _pick_niches_for_week(iso_week)

    logger.info(
        "Digest triggered — week %d (%s) — niches: %s",
        iso_week, send_date, selected_niches,
    )

    # --- Run pipelines concurrently ---
    logger.info("Running pipelines for %d niches...", len(selected_niches))
    pipeline_results = await asyncio.gather(
        *[_run_pipeline_for_niche(niche) for niche in selected_niches],
        return_exceptions=True,
    )

    niche_data: list[dict] = []
    for i, result in enumerate(pipeline_results):
        if isinstance(result, Exception):
            logger.error("Pipeline failed for niche '%s': %s", selected_niches[i], result)
            continue
        if result is None:
            logger.warning("No data returned for niche '%s'", selected_niches[i])
            continue
        niche_data.append(result)

    if len(niche_data) < 3:
        logger.error(
            "Only %d of 3 niches produced results — aborting digest send", len(niche_data)
        )
        return {
            "status": "aborted",
            "reason": f"Only {len(niche_data)}/3 niches produced results",
            "week": iso_week,
            "niches": selected_niches,
        }

    # Use exactly the first 3 successful results
    niche_data = niche_data[:3]

    # --- Fetch subscribers ---
    logger.info("Fetching Loops subscribers...")
    subscribers = await _fetch_loops_subscribers()
    logger.info("Found %d subscribers", len(subscribers))

    if not subscribers:
        return {
            "status": "no_subscribers",
            "week": iso_week,
            "niches": [n["label"] for n in niche_data],
        }

    # --- Send emails ---
    delivered = 0
    async with httpx.AsyncClient() as client:
        # Batch sends with controlled concurrency (10 at a time)
        semaphore = asyncio.Semaphore(10)

        async def _send_one(email: str) -> bool:
            async with semaphore:
                return await _send_digest_email(email, iso_week, send_date, niche_data, client)

        results = await asyncio.gather(*[_send_one(email) for email in subscribers])
        delivered = sum(1 for r in results if r is True)

    logger.info(
        "Digest complete — week %d — %d/%d delivered",
        iso_week, delivered, len(subscribers),
    )

    return {
        "status": "ok",
        "week": iso_week,
        "send_date": send_date,
        "subscribers": len(subscribers),
        "delivered": delivered,
        "niches": [n["label"] for n in niche_data],
    }
