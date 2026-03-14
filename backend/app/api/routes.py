import asyncio
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.config import get_settings
from ..core.limiter import limiter
from ..models.search import Workspace, Search, RawPost, PainCluster, PRDDraft
from ..schemas.search import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    ValidateMinimalRequest, SearchCreate, SearchResponse, ClusterResponse,
    ClusterWithSearchResponse,
    PRDResponse, OpportunityReport, RawPostResponse,
)
from ..services.pipeline import run_search_pipeline, generate_prd_for_cluster
from ..services import ai_service

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Workspaces ---

@router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(payload: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new workspace."""
    workspace = Workspace(name=payload.name)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("/workspaces", response_model=list[WorkspaceResponse])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    """List all workspaces."""
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    return result.scalars().all()


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a workspace by ID."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: UUID, payload: WorkspaceUpdate, db: AsyncSession = Depends(get_db)):
    """Update a workspace name."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.name = payload.name
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a workspace and unlink its searches."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Unlink searches instead of cascading delete
    for search in workspace.searches:
        search.workspace_id = None
    await db.delete(workspace)
    await db.commit()
    return {"status": "deleted"}


# --- Validate (Experiment 2) ---

@router.post("/validate-minimal", response_model=SearchResponse)
@limiter.limit(get_settings().rate_limit)
async def validate_minimal(
    request: Request,
    payload: ValidateMinimalRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Minimal Validate flow: idea -> 3 keywords -> OR query -> existing pipeline.
    Returns SearchResponse; frontend redirects to /discover?search_id=<id>.
    """
    keywords = await ai_service.extract_keywords_from_idea(payload.idea)
    query = " OR ".join(kw[:50] for kw in keywords)  # cap length per keyword
    sources = ["reddit", "hackernews", "amazon"]

    search = Search(query=query, sources=sources, workspace_id=None)
    db.add(search)
    await db.commit()
    await db.refresh(search)

    background_tasks.add_task(_run_pipeline_with_session, search.id, query, sources)
    return search


# --- Searches ---

@router.post("/searches", response_model=SearchResponse)
async def create_search(
    payload: SearchCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start a new pain point search."""
    valid_sources = {"reddit", "hackernews", "amazon", "g2", "youtube"}
    sources = [s for s in payload.sources if s in valid_sources]
    if not sources:
        sources = ["reddit", "hackernews", "amazon"]

    search = Search(query=payload.query, sources=sources, workspace_id=payload.workspace_id)
    db.add(search)
    await db.commit()
    await db.refresh(search)

    # Run pipeline in background
    background_tasks.add_task(_run_pipeline_with_session, search.id, payload.query, sources)

    return search


async def _run_pipeline_with_session(search_id: UUID, query: str, sources: list[str]):
    """Run the pipeline with a fresh DB session (for background tasks)."""
    from ..core.database import async_session
    async with async_session() as db:
        try:
            await run_search_pipeline(search_id, query, sources, db)
        except Exception as e:
            logger.error(f"Background pipeline error: {e}")
            search = await db.get(Search, search_id)
            if search:
                search.status = "failed"
                await db.commit()


@router.get("/searches", response_model=list[SearchResponse])
async def list_searches(workspace_id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    """List all searches, newest first. Optionally filter by workspace_id."""
    q = select(Search).order_by(Search.created_at.desc()).limit(50)
    if workspace_id is not None:
        q = q.where(Search.workspace_id == workspace_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/searches/{search_id}", response_model=SearchResponse)
async def get_search(search_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get search status and details."""
    search = await db.get(Search, search_id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    return search


@router.get("/searches/{search_id}/clusters", response_model=list[ClusterResponse])
async def get_clusters(search_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all pain point clusters for a search, ranked by opportunity score."""
    result = await db.execute(
        select(PainCluster)
        .where(PainCluster.search_id == search_id)
        .order_by(PainCluster.opportunity_score.desc())
    )
    return result.scalars().all()


@router.get("/clusters", response_model=list[ClusterWithSearchResponse])
async def list_all_clusters(workspace_id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    """Get all clusters across all completed searches, ranked by opportunity score. Optionally filter by workspace."""
    q = (
        select(PainCluster)
        .join(Search, PainCluster.search_id == Search.id)
        .where(Search.status == "completed")
        .order_by(PainCluster.opportunity_score.desc())
        .options(selectinload(PainCluster.search))
    )
    if workspace_id is not None:
        q = q.where(Search.workspace_id == workspace_id)
    result = await db.execute(q)
    clusters = result.scalars().all()
    return [
        ClusterWithSearchResponse(
            **ClusterResponse.model_validate(c).model_dump(),
            search_query=c.search.query,
        )
        for c in clusters
    ]


@router.get("/clusters/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(cluster_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single cluster by ID."""
    cluster = await db.get(PainCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


@router.get("/clusters/{cluster_id}/report", response_model=OpportunityReport)
async def get_opportunity_report(cluster_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get full opportunity report for a cluster."""
    cluster = await db.get(PainCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    # Get associated posts
    result = await db.execute(
        select(RawPost).where(RawPost.cluster_id == cluster_id).limit(20)
    )
    posts = result.scalars().all()

    # Get PRD if exists
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
@limiter.limit(get_settings().rate_limit)
async def create_prd(
    request: Request,
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Generate a PRD draft for a pain point cluster."""
    try:
        prd = await generate_prd_for_cluster(cluster_id, db)
        return prd
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/searches/{search_id}")
async def delete_search(search_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a search and all associated data."""
    search = await db.get(Search, search_id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    await db.delete(search)
    await db.commit()
    return {"status": "deleted"}
