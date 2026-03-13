from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class WorkspaceUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchCreate(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    sources: list[str] = Field(default=["reddit", "hackernews", "amazon"])
    workspace_id: Optional[UUID] = None


class SearchResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID] = None
    query: str
    status: str
    sources: list[str]
    total_posts_fetched: int
    total_complaints_found: int
    total_relevant_complaints: int = 0
    summary: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RawPostResponse(BaseModel):
    id: UUID
    source: str
    title: Optional[str] = None
    text: str
    author: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_complaint: bool
    complaint_score: Optional[float] = None
    relevance: str = "unrelated"
    relevance_score: float = 0.0
    content_type: str = "unknown"
    authenticity_score: float = 0.5

    model_config = {"from_attributes": True}


class ClusterResponse(BaseModel):
    id: UUID
    search_id: UUID
    label: str
    summary: Optional[str] = None
    complaint_count: int
    frequency_score: float
    emotion_score: float
    urgency_score: float
    relevance_score: float = 0.0
    opportunity_score: float
    avg_authenticity: float = 0.5
    source_breakdown: dict
    top_complaints: list
    who_has_problem: Optional[str] = None
    why_it_matters: Optional[str] = None
    suggested_solution: Optional[str] = None
    product_angle: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PRDResponse(BaseModel):
    id: UUID
    cluster_id: UUID
    product_concept: Optional[str] = None
    target_user: Optional[str] = None
    problem_statement: Optional[str] = None
    core_features: list
    mvp_suggestion: Optional[str] = None
    full_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClusterWithSearchResponse(ClusterResponse):
    """Cluster with parent search query for cross-search reports."""
    search_query: str


class OpportunityReport(BaseModel):
    cluster: ClusterResponse
    posts: list[RawPostResponse]
    prd: Optional[PRDResponse] = None
