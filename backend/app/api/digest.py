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
import hmac
import logging
import uuid

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select, desc

from ..core.config import get_settings
from ..core.database import async_session
from ..core.limiter import limiter
from ..core.utils import utcnow
from ..models.search import Search, PainCluster, RawPost, DigestSubscriber
from ..services.pipeline import run_search_pipeline
from ..services.trends import snapshot_clusters_for_niche

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


def _mask_email(email: str) -> str:
    local, sep, domain = (email or "").partition("@")
    if not sep:
        return ""
    return f"{local[:1]}***@{domain}"


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

        # Longitudinal snapshot — writes one ClusterSnapshot row per cluster
        # so we accumulate a weekly time series per niche. Failures here must
        # NOT block the digest send, so wrap in try/except.
        try:
            await snapshot_clusters_for_niche(db, niche=niche, search_id=search_id)
            await db.commit()
        except Exception as snapshot_err:
            logger.warning(
                "Cluster snapshot failed for niche=%r search_id=%s: %s",
                niche, search_id, snapshot_err,
            )
            await db.rollback()

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


async def _fetch_digest_subscribers() -> list[str]:
    """
    Fetch all active digest subscriber emails from our own database.
    Only returns subscribers where `subscribed = True`.
    """
    async with async_session() as db:
        result = await db.execute(
            select(DigestSubscriber.email).where(DigestSubscriber.subscribed == True)  # noqa: E712
        )
        return list(result.scalars().all())


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
        logger.warning(
            "Loops send failed for %s: status=%s",
            _mask_email(email),
            resp.status_code,
        )
        return False
    except Exception as e:
        logger.error("Loops send exception for %s: %s", _mask_email(email), e)
        return False


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/digest/send")
async def send_digest(
    x_digest_secret: str = Header(default=""),
    test_email: str | None = None,
):
    """
    Trigger the weekly Pain Point Digest send.
    Called by Render cron job every Friday at 8am Jamaica time (1pm UTC).
    Protected by X-Digest-Secret header.

    Optional query param:
      ?test_email=you@example.com — skips all real subscribers and sends only to this address.
      Use this to verify the pipeline and email template without touching real users.
    """
    # --- Auth ---
    # hmac.compare_digest avoids timing-side-channel leaks on the shared secret.
    if not settings.digest_secret or not hmac.compare_digest(
        x_digest_secret or "", settings.digest_secret
    ):
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

    # --- Fetch subscribers (or use test email) ---
    if test_email:
        logger.info("TEST MODE - sending only to: %s", _mask_email(test_email))
        subscribers = [test_email]
    else:
        logger.info("Fetching digest subscribers from database...")
        subscribers = await _fetch_digest_subscribers()
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
        "mode": "test" if test_email else "live",
        "week": iso_week,
        "send_date": send_date,
        "subscribers": len(subscribers),
        "delivered": delivered,
        "niches": [n["label"] for n in niche_data],
    }


# ---------------------------------------------------------------------------
# Subscribe / Unsubscribe endpoints
# ---------------------------------------------------------------------------
@router.post("/digest/subscribe")
@limiter.limit("5/minute")
async def subscribe_to_digest(request: Request, email: str):
    """
    Subscribe an email to the Pain Point Digest.
    Also creates/updates the contact in Loops for marketing purposes.

    Returns a uniform {"status": "ok"} response on success — we deliberately
    don't reveal whether the email was already in our DB, to prevent
    email-enumeration via this public endpoint.
    """
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    email = email.strip().lower()

    async with async_session() as db:
        result = await db.execute(
            select(DigestSubscriber).where(DigestSubscriber.email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            if not existing.subscribed:
                existing.subscribed = True
                existing.unsubscribed_at = None
                await db.commit()
        else:
            subscriber = DigestSubscriber(email=email)
            db.add(subscriber)
            await db.commit()

    # Also push to Loops as a contact (best-effort, don't fail if Loops is down)
    if settings.loops_api_key:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{LOOPS_API}/contacts/create",
                    headers={
                        "Authorization": f"Bearer {settings.loops_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"email": email, "source": "digest_subscribe"},
                )
        except Exception as e:
            logger.warning("Failed to sync subscriber to Loops: %s", e)

    return {"status": "ok"}


@router.post("/digest/unsubscribe")
@limiter.limit("5/minute")
async def unsubscribe_from_digest(request: Request, email: str):
    """Unsubscribe an email from the Pain Point Digest.

    Returns a uniform {"status": "ok"} response — see subscribe endpoint.
    """
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    email = email.strip().lower()

    async with async_session() as db:
        result = await db.execute(
            select(DigestSubscriber).where(DigestSubscriber.email == email)
        )
        existing = result.scalar_one_or_none()

        if existing and existing.subscribed:
            existing.subscribed = False
            existing.unsubscribed_at = utcnow()
            await db.commit()

    return {"status": "ok"}
