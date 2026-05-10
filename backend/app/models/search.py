import uuid
from sqlalchemy import String, Text, DateTime, Float, Integer, ForeignKey, JSON, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base
from ..core.utils import utcnow


class User(Base):
    """One row per signed-in Clerk user. Created automatically on first login."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    workspaces: Mapped[list["Workspace"]] = relationship(back_populates="user")
    searches: Mapped[list["Search"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} clerk_id={self.clerk_id!r}>"


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    # Owner — nullable so pre-auth workspaces (demo data) are preserved but hidden
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user: Mapped["User | None"] = relationship(back_populates="workspaces")

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
    # Owner — nullable so pre-auth searches (demo data) are preserved but hidden
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    query: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # sources is a JSON list of strings (e.g. ["reddit", "hackernews"]) — Mapped[list] (M8)
    sources: Mapped[list] = mapped_column(JSON, default=lambda: ["reddit", "hackernews", "amazon"])
    total_posts_fetched: Mapped[int] = mapped_column(Integer, default=0)
    total_complaints_found: Mapped[int] = mapped_column(Integer, default=0)
    total_relevant_complaints: Mapped[int] = mapped_column(Integer, default=0)
    # Counts against the user's free-tier quota only after the pipeline
    # produces at least one persisted opportunity cluster.
    is_quota_billable: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[str] = mapped_column(DateTime, nullable=True)

    workspace: Mapped["Workspace | None"] = relationship(back_populates="searches")
    user: Mapped["User | None"] = relationship(back_populates="searches")
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


class DigestSubscriber(Base):
    """Email addresses subscribed to the weekly Pain Point Digest."""
    __tablename__ = "digest_subscribers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    subscribed: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)
    unsubscribed_at: Mapped[str] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<DigestSubscriber email={self.email!r} subscribed={self.subscribed}>"


class ClusterSnapshot(Base):
    """
    Time-series snapshot of a pain cluster, captured weekly by the digest cron.

    Each row is a single (niche × ISO week × cluster_label) point. Stacking
    rows over weeks gives us the longitudinal pain dataset competitors can't
    replicate without their own multi-month history. Use cluster_label_norm
    for joining the same pain across weeks despite minor LLM label drift.
    """
    __tablename__ = "cluster_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # The niche query the cron ran (e.g. "fitness tracking apps").
    niche: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    # ISO 8601 calendar week. Composite-indexed with niche for time-series scans.
    iso_year: Mapped[int] = mapped_column(Integer, nullable=False)
    iso_week: Mapped[int] = mapped_column(Integer, nullable=False)
    # Original LLM-emitted label for display.
    cluster_label: Mapped[str] = mapped_column(String(300), nullable=False)
    # Normalized label (lowercase, whitespace-collapsed) for cross-week joins
    # despite minor wording drift in the LLM output.
    cluster_label_norm: Mapped[str] = mapped_column(
        String(300), nullable=False, index=True
    )
    cluster_summary: Mapped[str] = mapped_column(Text, nullable=True)
    # Volume + scoring snapshot.
    complaint_count: Mapped[int] = mapped_column(Integer, default=0)
    opportunity_score: Mapped[float] = mapped_column(Float, default=0.0)
    frequency_score: Mapped[float] = mapped_column(Float, default=0.0)
    emotion_score: Mapped[float] = mapped_column(Float, default=0.0)
    urgency_score: Mapped[float] = mapped_column(Float, default=0.0)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    avg_authenticity: Mapped[float] = mapped_column(Float, default=0.5)
    source_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    # Truncated representative quotes — vocabulary fingerprint for trend display.
    top_complaints: Mapped[list] = mapped_column(JSON, default=list)
    # Provenance back to the search that produced this snapshot.
    search_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("searches.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    created_at: Mapped[str] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint(
            "niche", "iso_year", "iso_week", "cluster_label_norm",
            name="uq_cluster_snapshots_niche_week_label",
        ),
        Index(
            "ix_cluster_snapshots_niche_week",
            "niche", "iso_year", "iso_week",
        ),
        Index(
            "ix_cluster_snapshots_niche_label",
            "niche", "cluster_label_norm",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ClusterSnapshot niche={self.niche!r} "
            f"week={self.iso_year}-W{self.iso_week:02d} "
            f"label={self.cluster_label!r}>"
        )


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
