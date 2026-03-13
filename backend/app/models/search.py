import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    searches: Mapped[list["Search"]] = relationship(back_populates="workspace", cascade="save-update")


class Search(Base):
    __tablename__ = "searches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True, index=True)
    query: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    sources: Mapped[dict] = mapped_column(JSON, default=lambda: ["reddit", "hackernews", "amazon"])
    total_posts_fetched: Mapped[int] = mapped_column(Integer, default=0)
    total_complaints_found: Mapped[int] = mapped_column(Integer, default=0)
    total_relevant_complaints: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    workspace: Mapped["Workspace | None"] = relationship(back_populates="searches")
    raw_posts: Mapped[list["RawPost"]] = relationship(back_populates="search", cascade="all, delete-orphan")
    clusters: Mapped[list["PainCluster"]] = relationship(back_populates="search", cascade="all, delete-orphan")


class RawPost(Base):
    __tablename__ = "raw_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("searches.id"), index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(200), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_complaint: Mapped[bool] = mapped_column(default=False)
    complaint_score: Mapped[float] = mapped_column(Float, nullable=True)
    relevance: Mapped[str] = mapped_column(String(30), default="unrelated")
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    content_type: Mapped[str] = mapped_column(String(30), default="unknown")
    authenticity_score: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    search: Mapped["Search"] = relationship(back_populates="raw_posts")
    cluster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pain_clusters.id"), nullable=True)


class PainCluster(Base):
    __tablename__ = "pain_clusters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("searches.id"), index=True)
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    search: Mapped["Search"] = relationship(back_populates="clusters")
    posts: Mapped[list["RawPost"]] = relationship(foreign_keys=[RawPost.cluster_id])
    prd: Mapped["PRDDraft"] = relationship(back_populates="cluster", uselist=False, cascade="all, delete-orphan")


class PRDDraft(Base):
    __tablename__ = "prd_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pain_clusters.id"), unique=True)
    product_concept: Mapped[str] = mapped_column(Text, nullable=True)
    target_user: Mapped[str] = mapped_column(Text, nullable=True)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=True)
    core_features: Mapped[list] = mapped_column(JSON, default=list)
    mvp_suggestion: Mapped[str] = mapped_column(Text, nullable=True)
    full_text: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cluster: Mapped["PainCluster"] = relationship(back_populates="prd")
