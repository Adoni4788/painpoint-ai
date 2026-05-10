"""
Public API for longitudinal cluster snapshots.

Reads the cluster_snapshots table written by the weekly digest cron.
The endpoints are intentionally open to all authenticated users (or
anonymous in dev mode) — the data is aggregated niche-level signal, not
user-specific.

Endpoints:
- GET /api/trends/niches            — list niches with at least one snapshot
- GET /api/trends/niche/{niche}     — full time-series for a single niche
- GET /api/trends/cluster/{label}   — time-series for a single (niche, label)
                                      pair, with delta vs the previous week
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import get_current_user
from ..core.database import get_db
from ..models.search import ClusterSnapshot, User
from ..schemas.search import (
    ClusterSnapshotPoint,
    ClusterTrendDelta,
    NicheTrendResponse,
)
from ..services.trends import normalize_cluster_label

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/trends/niches", response_model=list[str])
async def list_niches_with_trends(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List every niche that has at least one snapshot point."""
    result = await db.execute(
        select(distinct(ClusterSnapshot.niche)).order_by(ClusterSnapshot.niche)
    )
    return list(result.scalars().all())


@router.get("/trends/niche/{niche}", response_model=NicheTrendResponse)
async def get_niche_trend(
    niche: str,
    weeks: int = Query(default=12, ge=1, le=104),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Full time-series for a niche, ordered oldest -> newest. Includes the
    last `weeks` calendar weeks of snapshots (across all clusters in that
    niche).
    """
    safe_niche = niche.strip()[:500]
    if not safe_niche:
        raise HTTPException(status_code=400, detail="niche cannot be empty")

    # Pull the most recent N week-buckets for this niche, then expand back
    # into all snapshot rows in those buckets.
    week_rows = await db.execute(
        select(ClusterSnapshot.iso_year, ClusterSnapshot.iso_week)
        .where(ClusterSnapshot.niche == safe_niche)
        .group_by(ClusterSnapshot.iso_year, ClusterSnapshot.iso_week)
        .order_by(
            ClusterSnapshot.iso_year.desc(),
            ClusterSnapshot.iso_week.desc(),
        )
        .limit(weeks)
    )
    week_keys = list(week_rows.all())
    if not week_keys:
        return NicheTrendResponse(
            niche=safe_niche,
            weeks_covered=0,
            cluster_labels=[],
            points=[],
        )

    # SQLAlchemy IN over composite tuples is awkward; expand to OR.
    from sqlalchemy import and_, or_
    week_predicate = or_(
        *[
            and_(
                ClusterSnapshot.iso_year == y,
                ClusterSnapshot.iso_week == w,
            )
            for (y, w) in week_keys
        ]
    )
    result = await db.execute(
        select(ClusterSnapshot)
        .where(ClusterSnapshot.niche == safe_niche)
        .where(week_predicate)
        .order_by(
            ClusterSnapshot.iso_year.asc(),
            ClusterSnapshot.iso_week.asc(),
        )
    )
    snapshots = list(result.scalars().all())

    points = [
        ClusterSnapshotPoint(
            iso_year=s.iso_year,
            iso_week=s.iso_week,
            cluster_label=s.cluster_label,
            cluster_label_norm=s.cluster_label_norm,
            cluster_summary=s.cluster_summary,
            complaint_count=s.complaint_count,
            opportunity_score=s.opportunity_score,
            frequency_score=s.frequency_score,
            emotion_score=s.emotion_score,
            urgency_score=s.urgency_score,
            relevance_score=s.relevance_score,
            avg_authenticity=s.avg_authenticity,
            source_breakdown=dict(s.source_breakdown or {}),
            captured_at=s.created_at,
        )
        for s in snapshots
    ]

    seen_labels = sorted({p.cluster_label for p in points})

    return NicheTrendResponse(
        niche=safe_niche,
        weeks_covered=len(week_keys),
        cluster_labels=seen_labels,
        points=points,
    )


@router.get("/trends/cluster", response_model=ClusterTrendDelta)
async def get_cluster_trend(
    niche: str = Query(..., min_length=1, max_length=500),
    label: str = Query(..., min_length=1, max_length=300),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Time-series for one (niche, cluster_label) pair. Joins by normalized
    label so a minor wording drift (e.g. "Unstable Video Calls" vs
    "Unstable Video Connections") still resolves to the same series.

    Returns the points oldest -> newest plus a delta-vs-previous summary
    for the latest week.
    """
    safe_niche = niche.strip()[:500]
    label_norm = normalize_cluster_label(label)[:300]
    if not safe_niche or not label_norm:
        raise HTTPException(status_code=400, detail="niche and label required")

    result = await db.execute(
        select(ClusterSnapshot)
        .where(ClusterSnapshot.niche == safe_niche)
        .where(ClusterSnapshot.cluster_label_norm == label_norm)
        .order_by(
            ClusterSnapshot.iso_year.asc(),
            ClusterSnapshot.iso_week.asc(),
        )
    )
    snapshots = list(result.scalars().all())

    if not snapshots:
        raise HTTPException(
            status_code=404,
            detail=f"No snapshots for niche={safe_niche!r} label={label!r}",
        )

    points = [
        ClusterSnapshotPoint(
            iso_year=s.iso_year,
            iso_week=s.iso_week,
            cluster_label=s.cluster_label,
            cluster_label_norm=s.cluster_label_norm,
            cluster_summary=s.cluster_summary,
            complaint_count=s.complaint_count,
            opportunity_score=s.opportunity_score,
            frequency_score=s.frequency_score,
            emotion_score=s.emotion_score,
            urgency_score=s.urgency_score,
            relevance_score=s.relevance_score,
            avg_authenticity=s.avg_authenticity,
            source_breakdown=dict(s.source_breakdown or {}),
            captured_at=s.created_at,
        )
        for s in snapshots
    ]

    latest = points[-1]
    previous = points[-2] if len(points) >= 2 else None
    delta_pct: Optional[float] = None
    if previous and previous.opportunity_score:
        delta_pct = round(
            (latest.opportunity_score - previous.opportunity_score)
            / previous.opportunity_score
            * 100.0,
            1,
        )

    return ClusterTrendDelta(
        cluster_label=latest.cluster_label,
        cluster_label_norm=latest.cluster_label_norm,
        latest_iso_year=latest.iso_year,
        latest_iso_week=latest.iso_week,
        latest_opportunity_score=latest.opportunity_score,
        previous_opportunity_score=previous.opportunity_score if previous else None,
        opportunity_score_delta_pct=delta_pct,
        weeks_observed=len(points),
        points=points,
    )
