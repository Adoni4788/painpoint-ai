"""
Longitudinal pain-trend snapshots.

Each Friday the digest cron runs the full pipeline on a rotation of niches.
After each successful run we capture every cluster as a row in
`cluster_snapshots`, keyed by (niche, ISO year, ISO week, cluster label).
Stacking these rows over weeks gives us a time series competitors can't
backfill — the dataset *is* the moat.

This module owns:
- snapshot_clusters_for_niche(): write all clusters of a Search to snapshots
- normalize_cluster_label(): collapse minor LLM wording drift so the same
  underlying pain matches across weeks
"""
from __future__ import annotations

import logging
import re
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.utils import utcnow
from ..models.search import ClusterSnapshot, PainCluster

logger = logging.getLogger(__name__)

_NORM_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize_cluster_label(label: str) -> str:
    """
    Lowercase + strip non-alphanumerics for cross-week joins. The LLM might
    emit "Unstable Video Calls" one week and "Unstable Video Connections"
    the next — both normalize to similar tokens for downstream matching.
    """
    if not label:
        return ""
    return _NORM_NON_ALNUM.sub(" ", label.lower()).strip()


async def snapshot_clusters_for_niche(
    db: AsyncSession,
    niche: str,
    search_id: uuid.UUID,
    snapshot_date: date | None = None,
) -> int:
    """
    Persist a ClusterSnapshot row for every PainCluster on the given Search.

    Returns the number of snapshots upserted. The database enforces one row
    per (niche, ISO week, normalized cluster label), so operator retries update
    the current weekly point instead of duplicating trend history.
    """
    if snapshot_date is None:
        snapshot_date = utcnow().date()
    iso_year, iso_week, _ = snapshot_date.isocalendar()

    result = await db.execute(
        select(PainCluster).where(PainCluster.search_id == search_id)
    )
    clusters = result.scalars().all()

    if not clusters:
        logger.info(
            "No clusters to snapshot for niche=%r search_id=%s", niche, search_id
        )
        return 0

    written = 0
    safe_niche = niche.strip()[:500] or "unknown"
    for c in clusters:
        label_norm = normalize_cluster_label(c.label or "")[:300] or "unknown"
        existing = await db.execute(
            select(ClusterSnapshot).where(
                ClusterSnapshot.niche == safe_niche,
                ClusterSnapshot.iso_year == int(iso_year),
                ClusterSnapshot.iso_week == int(iso_week),
                ClusterSnapshot.cluster_label_norm == label_norm,
            )
        )
        snapshot = existing.scalar_one_or_none()
        if snapshot is None:
            snapshot = ClusterSnapshot(
                niche=safe_niche,
                iso_year=int(iso_year),
                iso_week=int(iso_week),
                cluster_label_norm=label_norm,
            )
            db.add(snapshot)

        snapshot.cluster_label = (c.label or "")[:300]
        snapshot.cluster_summary = c.summary
        snapshot.complaint_count = c.complaint_count or 0
        snapshot.opportunity_score = float(c.opportunity_score or 0.0)
        snapshot.frequency_score = float(c.frequency_score or 0.0)
        snapshot.emotion_score = float(c.emotion_score or 0.0)
        snapshot.urgency_score = float(c.urgency_score or 0.0)
        snapshot.relevance_score = float(c.relevance_score or 0.0)
        snapshot.avg_authenticity = float(c.avg_authenticity or 0.5)
        snapshot.source_breakdown = dict(c.source_breakdown or {})
        snapshot.top_complaints = [t[:300] for t in (c.top_complaints or [])][:5]
        snapshot.search_id = search_id
        snapshot.created_at = utcnow()
        written += 1

    await db.flush()
    logger.info(
        "Upserted %d cluster snapshot(s) for niche=%r week=%d-W%02d search_id=%s",
        written, niche, iso_year, iso_week, search_id,
    )
    return written
