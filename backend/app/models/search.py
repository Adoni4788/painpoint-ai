import uuid
from sqlalchemy import String, Text, DateTime, Float, Integer, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base
from ..core.utils import utcnow


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    # cascade="save-update" (not "all, delete-orphan") is intentional:
    # deleting a workspace unlinks its searches rather than cascading the delete.
    searches: Mapped[list["Search"]] = relationship(
        back_populates="workspace", cascade="save-update"
    )

    def __repr__(self) -> str:
        return f"<Workspace id={self.id} name={self.name!r}>"


class Search(Base):
    __tablename__ = "searches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True, index=True
    )
    query: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # sources is a JSON list of strings (e.g. ["reddit", "hackernews"]) — Mapped[list] (M8)
    sources: Mapped[list] = mapped_column(JSON, default=lambda: ["reddit", "hackernews", "amazon"])
    total_posts_fetched: Mapped[int] = mapped_column(Integer, default=0)
    total_complaints_found: Mapped[int] = mapped_column(Integer, default=0)
    total_relevant_complaints: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[str] = mapped_column(DateTime, nullable=True)

    workspace: Mapped["Workspace | None"] = relationship(back_populates="searches")
    raw_posts: Mapped[list["RawPost"]] = relationship(
        back_populates="search", cascade="all, delete-orphan"
    )
    clusters: Mapped[list["PainCluster"]] = relationship(
        back_populates="search", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Search id={self.id} query={self.query!r} status={self.status}>"


class RawPost(Base):
    __tablename__ = "raw_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("searches.id"), index=True
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(200), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=True)
    timestamp: Mapped[str] = mapped_column(DateTime, nullable=True)
    is_complaint: Mapped[bool] = mapped_column(default=False)
    complaint_score: Mapped[float] = mapped_column(Float, nullable=True)
    relevance: Mapped[str] = mapped_column(String(30), default="unrelated")
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    content_type: Mapped[str] = mapped_column(String(30), default="unknown")
    authenticity_score: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)
    # index=True on cluster_id — used in GET /clusters/{id}/report (M7)
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pain_clusters.id"), nullable=True, index=True
    )

    search: Mapped["Search"] = relationship(back_populates="raw_posts")

    def __repr__(self) -> str:
        return f"<RawPost id={self.id} source={self.source!r} is_complaint={self.is_complaint}>"


class PainCluster(Base):
    __tablename__ = "pain_clusters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("searches.id"), index=True
    )
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    complaint_count: Mapped[int] = mapped_column(Integer, default=0)
    frequency_score: Mapped[float] = mapped_column(Float, default=0.0)
    emotion_score: Mapped[float] = mapped_column(Float, default=0.0)
    urgency_score: Mapped[float] = mapped_column(Float, default=0.0)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    opportunity_score: Mapped[float] = mapped_column(Float, default=0.0)
    avg_authenticity: Mapped[float] = mapped_column(Float, default=0.5)
    source_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    top_complaints: Mapped[list] = mapped_column(JSON, default=list)
    who_has_problem: Mapped[str] = mapped_column(Text, nullable=True)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=True)
    suggested_solution: Mapped[str] = mapped_column(Text, nullable=True)
    product_angle: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    search: Mapped["Search"] = relationship(back_populates="clusters")
    posts: Mapped[list["RawPost"]] = relationship(foreign_keys=[RawPost.cluster_id])
    prd: Mapped["PRDDraft"] = relationship(
        back_populates="cluster", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PainCluster id={self.id} label={self.label!r} score={self.opportunity_score}>"


class PRDDraft(Base):
    __tablename__ = "prd_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pain_clusters.id"), unique=True
    )
    product_concept: Mapped[str] = mapped_column(Text, nullable=True)
    target_user: Mapped[str] = mapped_column(Text, nullable=True)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=True)
    core_features: Mapped[list] = mapped_column(JSON, default=list)
    mvp_suggestion: Mapped[str] = mapped_column(Text, nullable=True)
    full_text: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    cluster: Mapped["PainCluster"] = relationship(back_populates="prd")

    def __repr__(self) -> str:
        return f"<PRDDraft id={self.id} cluster_id={self.cluster_id}>"
