import asyncio
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.config import get_settings
from ..core.limiter import limiter
from ..core.auth import get_current_user
from ..core.utils import utcnow
from ..models.search import Workspace, Search, RawPost, PainCluster, PRDDraft, User
from ..schemas.search import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    ValidateMinimalRequest, SearchCreate, SearchResponse, ClusterResponse,
    ClusterWithSearchResponse,
    PRDResponse, OpportunityReport, RawPostResponse,
)
from ..services.pipeline import run_search_pipeline, generate_prd_for_cluster, IN_PROGRESS_STATUSES
from ..services import ai_service

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()



# ---------------------------------------------------------------------------
# Ownership verification helpers
#
# In production, get_current_user() either returns a User or raises 401, so
# `current_user is None` only happens when CLERK_ISSUER_URL is unset (dev mode).
# Each helper below short-circuits ownership checks in that case so the
# unauthenticated dev workflow keeps functioning. The lifespan check in
# main.py refuses to start a "production" environment without CLERK_ISSUER_URL,
# so the dev-mode branches are not reachable in real deployments.
# ---------------------------------------------------------------------------

async def _get_search_or_403(
    search_id: UUID,
    db: AsyncSession,
    current_user: Optional[User],
) -> Search:
    """Fetch search by ID; raise 404 if not found, 403 if not owned by current_user."""
    search = await db.get(Search, search_id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    if current_user is not None and search.user_id is not None and search.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return search


async def _get_cluster_or_403(
    cluster_id: UUID,
    db: AsyncSession,
    current_user: Optional[User],
) -> PainCluster:
    """Fetch cluster by ID; raise 404 if not found, 403 if parent search not owned by current_user."""
    cluster = await db.get(PainCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    if current_user is not None:
        search = await db.get(Search, cluster.search_id)
        if search and search.user_id is not None and search.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    return cluster


async def _get_workspace_or_403(
    workspace_id: UUID,
    db: AsyncSession,
    current_user: Optional[User],
) -> Workspace:
    """Fetch workspace by ID; raise 404 if not found, 403 if not owned by current_user."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if current_user is not None and workspace.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return workspace


# ---------------------------------------------------------------------------
# Pro-gate: free users get 3 searches/month, Pro users are unlimited.
# Pro status is stored in Clerk public_metadata.pro (set by LS webhook).
# The backend checks the JWT claims for this � Clerk includes public_metadata
# in the session token when configured, but we also accept header override.
# For simplicity we count searches per calendar month in the DB.
# ---------------------------------------------------------------------------
FREE_MONTHLY_SEARCH_LIMIT = 3
_search_create_locks: dict[str, asyncio.Lock] = {}


def _search_limit_key(current_user: "User | None") -> str:
    return f"user:{current_user.id}" if current_user is not None else "anonymous"


def _get_search_create_lock(key: str) -> asyncio.Lock:
    lock = _search_create_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _search_create_locks[key] = lock
    return lock


async def _check_search_limit(
    db: AsyncSession,
    current_user: "User | None",
) -> None:
    """Raise 402 if a free-tier user has hit their monthly search limit."""
    if current_user is None:
        # Dev mode only: get_current_user() never returns None when
        # CLERK_ISSUER_URL is set, and main.py refuses to start "production"
        # without it. So this branch is unreachable in real deployments.
        return

    # Pro status is attached to the user object by get_current_user()
    # from the Clerk JWT public_metadata.pro claim.
    if getattr(current_user, "_is_pro", False):
        return

    # Count searches this calendar month
    # Use naive UTC datetime to match the DB column (TIMESTAMP WITHOUT TIME ZONE)
    now = utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Search.id))
        .where(Search.user_id == current_user.id)
        .where(Search.created_at >= first_of_month)
    )
    count = result.scalar() or 0

    if count >= FREE_MONTHLY_SEARCH_LIMIT:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Free plan limit reached ({FREE_MONTHLY_SEARCH_LIMIT} searches/month). "
                "Upgrade to Pro for unlimited searches."
            ),
        )


async def _create_search_after_limit_check(
    db: AsyncSession,
    current_user: "User | None",
    *,
    query: str,
    sources: list[str],
    workspace_id: UUID | None = None,
) -> Search:
    """
    Check quota and create the Search under the same per-user process lock.

    This closes the common single-instance race where a free user fires
    multiple requests at once. A DB-backed counter is still the stronger
    cross-instance option if the service is scaled horizontally.
    """
    async with _get_search_create_lock(_search_limit_key(current_user)):
        await _check_search_limit(db, current_user)
        search = Search(
            query=query,
            sources=sources,
            workspace_id=workspace_id,
            user_id=current_user.id if current_user else None,
        )
        db.add(search)
        await db.commit()
        await db.refresh(search)
        return search

# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------

@router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(
    payload: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    workspace = Workspace(
        name=payload.name,
        user_id=current_user.id if current_user else None,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("/workspaces", response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    q = select(Workspace).order_by(Workspace.created_at.desc())
    if current_user is not None:
        q = q.where(Workspace.user_id == current_user.id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    workspace = await _get_workspace_or_403(workspace_id, db, current_user)
    return workspace


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    workspace = await _get_workspace_or_403(workspace_id, db, current_user)
    workspace.name = payload.name
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Delete a workspace and unlink its searches (searches themselves are kept)."""
    await _get_workspace_or_403(workspace_id, db, current_user)
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace_id)
        .options(selectinload(Workspace.searches))
    )
    workspace = result.scalar_one()

    for search in workspace.searches:
        search.workspace_id = None

    await db.delete(workspace)
    await db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Validate (Experiment 2)
# ---------------------------------------------------------------------------

@router.post("/validate-minimal", response_model=SearchResponse)
@limiter.limit(settings.rate_limit)
async def validate_minimal(
    request: Request,
    payload: ValidateMinimalRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Minimal Validate flow: idea → 3 keywords → OR query → existing pipeline."""
    try:
        keywords = await ai_service.extract_keywords_from_idea(payload.idea)
        logger.info("Validate keywords for idea '%s': %s", payload.idea[:80], keywords)

        # Coherence guard: if the 3 extracted keywords describe multiple unrelated
        # niches, OR-joining them produces low-signal cross-niche results (e.g.
        # "meditation audio OR remote sessions OR connecting with friends" ends up
        # mixing meditation, B2B collab, and social into one corpus). Refuse and
        # nudge the user to focus.
        coherence = await ai_service.assess_keyword_coherence(payload.idea, keywords)
        if not coherence.get("coherent", True):
            reason = coherence.get("reason") or "your idea covers multiple distinct niches"
            focus = coherence.get("suggested_focus") or ""
            message = (
                f"Your idea looks like it covers more than one niche — {reason}"
            )
            if focus:
                message += f" Try focusing on one and rerun, e.g. \"{focus}\"."
            else:
                message += " Try rephrasing to focus on a single niche and rerun."
            logger.info(
                "validate_minimal blocked for incoherent keywords idea='%s' kw=%s focus='%s'",
                payload.idea[:80], keywords, focus,
            )
            raise HTTPException(status_code=400, detail=message)

        query = " OR ".join(kw[:50] for kw in keywords)
        sources = ["reddit", "hackernews", "amazon"]

        search = await _create_search_after_limit_check(
            db,
            current_user,
            query=query,
            sources=sources,
            workspace_id=None,
        )

        background_tasks.add_task(_run_pipeline_with_session, search.id, query, sources)
        return search
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("validate_minimal failed for idea='%s': %s", payload.idea[:80], exc)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


# ---------------------------------------------------------------------------
# Searches
# ---------------------------------------------------------------------------

@router.post("/searches", response_model=SearchResponse)
@limiter.limit(settings.rate_limit)
async def create_search(
    request: Request,
    payload: SearchCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Start a new pain point search."""
    valid_sources = {"reddit", "hackernews", "amazon", "g2", "youtube", "facebook", "stackoverflow"}
    sources = [s for s in payload.sources if s in valid_sources] or ["reddit", "hackernews", "amazon"]

    if payload.workspace_id is not None:
        await _get_workspace_or_403(payload.workspace_id, db, current_user)

    search = await _create_search_after_limit_check(
        db,
        current_user,
        query=payload.query,
        sources=sources,
        workspace_id=payload.workspace_id,
    )

    background_tasks.add_task(_run_pipeline_with_session, search.id, payload.query, sources)
    return search


async def _run_pipeline_with_session(search_id: UUID, query: str, sources: list[str]):
    """Run the pipeline with a fresh DB session (required for background tasks)."""
    from ..core.database import async_session
    async with async_session() as db:
        try:
            await asyncio.wait_for(
                run_search_pipeline(search_id, query, sources, db),
                timeout=settings.pipeline_timeout_seconds,  # L2: from config, not hardcoded
            )
        except asyncio.TimeoutError:
            logger.error(
                "Pipeline timed out for search %s after %ds",
                search_id, settings.pipeline_timeout_seconds,
            )
            search = await db.get(Search, search_id)
            if search:
                search.status = "failed"
                await db.commit()
        except Exception as e:
            logger.error("Background pipeline error for search %s: %s", search_id, e)
            search = await db.get(Search, search_id)
            if search:
                search.status = "failed"
                await db.commit()


@router.get("/searches", response_model=list[SearchResponse])
async def list_searches(
    workspace_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List searches, newest first (max 50). Optionally filter by workspace_id."""
    q = select(Search).order_by(Search.created_at.desc()).limit(50)
    if workspace_id is not None:
        await _get_workspace_or_403(workspace_id, db, current_user)
        q = q.where(Search.workspace_id == workspace_id)
    if current_user is not None:
        q = q.where(Search.user_id == current_user.id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/searches/{search_id}", response_model=SearchResponse)
async def get_search(
    search_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    search = await _get_search_or_403(search_id, db, current_user)
    return search


@router.get("/searches/{search_id}/clusters", response_model=list[ClusterResponse])
async def get_clusters(
    search_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all pain point clusters for a search, ranked by opportunity score."""
    await _get_search_or_403(search_id, db, current_user)

    result = await db.execute(
        select(PainCluster)
        .where(PainCluster.search_id == search_id)
        .order_by(PainCluster.opportunity_score.desc())
    )
    return result.scalars().all()


@router.delete("/searches/{search_id}")
async def delete_search(
    search_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Delete a search and all associated data."""
    search = await _get_search_or_403(search_id, db, current_user)

    # Refuse deletion while pipeline is actively running to prevent orphaned state (L3)
    if search.status in IN_PROGRESS_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete a search while it is in progress (status: {search.status}). "
                "Wait for it to complete or fail, then try again."
            ),
        )

    await db.delete(search)
    await db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Clusters
# ---------------------------------------------------------------------------

@router.get("/clusters", response_model=list[ClusterWithSearchResponse])
async def list_all_clusters(
    workspace_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Get clusters across all completed searches, ranked by opportunity score.
    Paginated via limit/offset query params (default 100, max 500). (H1)
    """
    q = (
        select(PainCluster)
        .join(Search, PainCluster.search_id == Search.id)
        .where(Search.status == "completed")
        .order_by(PainCluster.opportunity_score.desc())
        .options(selectinload(PainCluster.search))
        .limit(limit)
        .offset(offset)
    )
    if workspace_id is not None:
        q = q.where(Search.workspace_id == workspace_id)
    if current_user is not None:
        q = q.where(Search.user_id == current_user.id)

    result = await db.execute(q)
    clusters = result.scalars().all()

    return [
        ClusterWithSearchResponse(
            **ClusterResponse.model_validate(c).model_dump(),
            search_query=c.search.query if c.search else "",
        )
        for c in clusters
    ]


@router.get("/clusters/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    cluster = await _get_cluster_or_403(cluster_id, db, current_user)
    return cluster


@router.get("/clusters/{cluster_id}/report", response_model=OpportunityReport)
async def get_opportunity_report(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get full opportunity report for a cluster."""
    cluster = await _get_cluster_or_403(cluster_id, db, current_user)

    posts_result = await db.execute(
        select(RawPost).where(RawPost.cluster_id == cluster_id).limit(20)
    )
    posts = posts_result.scalars().all()

    prd_result = await db.execute(
        select(PRDDraft).where(PRDDraft.cluster_id == cluster_id)
    )
    prd = prd_result.scalar_one_or_none()

    return OpportunityReport(
        cluster=ClusterResponse.model_validate(cluster),
        posts=[RawPostResponse.model_validate(p) for p in posts],
        prd=PRDResponse.model_validate(prd) if prd else None,
    )


@router.post("/clusters/{cluster_id}/prd", response_model=PRDResponse)
@limiter.limit(settings.rate_limit)
async def create_prd(
    request: Request,
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate a PRD draft for a pain point cluster."""
    cluster = await _get_cluster_or_403(cluster_id, db, current_user)
    try:
        prd = await generate_prd_for_cluster(cluster_id, db)
        return prd
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
