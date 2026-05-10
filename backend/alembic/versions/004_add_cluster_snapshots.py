"""Add cluster_snapshots table for longitudinal pain-trend tracking.

Revision ID: 004
Revises: 003
Create Date: 2026-05-10

What this migration does:
- Creates the `cluster_snapshots` table — one row per (niche × ISO week ×
  cluster_label) captured by the digest cron each Friday. Stacking rows
  over weeks produces the longitudinal pain dataset.
- Adds composite indexes for the two common access paths:
    (niche, iso_year, iso_week) — "show me snapshots for niche X in week N"
    (niche, cluster_label_norm) — "show me how 'unstable connections' has
    trended in 'video conferencing' across all weeks"
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cluster_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("niche", sa.String(500), nullable=False),
        sa.Column("iso_year", sa.Integer(), nullable=False),
        sa.Column("iso_week", sa.Integer(), nullable=False),
        sa.Column("cluster_label", sa.String(300), nullable=False),
        sa.Column("cluster_label_norm", sa.String(300), nullable=False),
        sa.Column("cluster_summary", sa.Text(), nullable=True),
        sa.Column("complaint_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("opportunity_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("frequency_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("emotion_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("urgency_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("relevance_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("avg_authenticity", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("source_breakdown", postgresql.JSON(), nullable=True),
        sa.Column("top_complaints", postgresql.JSON(), nullable=True),
        sa.Column(
            "search_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("searches.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_cluster_snapshots_niche", "cluster_snapshots", ["niche"]
    )
    op.create_index(
        "ix_cluster_snapshots_cluster_label_norm",
        "cluster_snapshots",
        ["cluster_label_norm"],
    )
    op.create_index(
        "ix_cluster_snapshots_search_id",
        "cluster_snapshots",
        ["search_id"],
    )
    op.create_index(
        "ix_cluster_snapshots_niche_week",
        "cluster_snapshots",
        ["niche", "iso_year", "iso_week"],
    )
    op.create_index(
        "ix_cluster_snapshots_niche_label",
        "cluster_snapshots",
        ["niche", "cluster_label_norm"],
    )


def downgrade() -> None:
    op.drop_index("ix_cluster_snapshots_niche_label", table_name="cluster_snapshots")
    op.drop_index("ix_cluster_snapshots_niche_week", table_name="cluster_snapshots")
    op.drop_index("ix_cluster_snapshots_search_id", table_name="cluster_snapshots")
    op.drop_index("ix_cluster_snapshots_cluster_label_norm", table_name="cluster_snapshots")
    op.drop_index("ix_cluster_snapshots_niche", table_name="cluster_snapshots")
    op.drop_table("cluster_snapshots")
