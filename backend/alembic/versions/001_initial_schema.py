"""Initial schema — full table definitions as of March 2026.

Supersedes the inline ALTER TABLE calls that previously lived in init_db().
This migration represents the complete schema including:
- workspaces table
- searches table (with workspace_id FK and summary column)
- raw_posts table (with authenticity_score, content_type, relevance columns)
- pain_clusters table
- prd_drafts table

Revision ID: 001
Revises: (none — initial migration)
Create Date: 2026-03-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- workspaces ---
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # --- searches ---
    op.create_table(
        "searches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id"),
            nullable=True,
        ),
        sa.Column("query", sa.String(500), nullable=False),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("sources", sa.JSON(), nullable=True),
        sa.Column("total_posts_fetched", sa.Integer(), nullable=True),
        sa.Column("total_complaints_found", sa.Integer(), nullable=True),
        sa.Column("total_relevant_complaints", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_searches_query", "searches", ["query"])
    op.create_index("ix_searches_workspace_id", "searches", ["workspace_id"])

    # --- pain_clusters (created before raw_posts so raw_posts can FK to it) ---
    op.create_table(
        "pain_clusters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "search_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("searches.id"),
            nullable=False,
        ),
        sa.Column("label", sa.String(300), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("complaint_count", sa.Integer(), nullable=True),
        sa.Column("frequency_score", sa.Float(), nullable=True),
        sa.Column("emotion_score", sa.Float(), nullable=True),
        sa.Column("urgency_score", sa.Float(), nullable=True),
        sa.Column("relevance_score", sa.Float(), nullable=True),
        sa.Column("opportunity_score", sa.Float(), nullable=True),
        sa.Column("avg_authenticity", sa.Float(), nullable=True),
        sa.Column("source_breakdown", sa.JSON(), nullable=True),
        sa.Column("top_complaints", sa.JSON(), nullable=True),
        sa.Column("who_has_problem", sa.Text(), nullable=True),
        sa.Column("why_it_matters", sa.Text(), nullable=True),
        sa.Column("suggested_solution", sa.Text(), nullable=True),
        sa.Column("product_angle", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_pain_clusters_search_id", "pain_clusters", ["search_id"])

    # --- raw_posts ---
    op.create_table(
        "raw_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "search_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("searches.id"),
            nullable=False,
        ),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("author", sa.String(200), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("is_complaint", sa.Boolean(), nullable=True),
        sa.Column("complaint_score", sa.Float(), nullable=True),
        sa.Column("relevance", sa.String(30), nullable=True),
        sa.Column("relevance_score", sa.Float(), nullable=True),
        sa.Column("content_type", sa.String(30), nullable=True),
        sa.Column("authenticity_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pain_clusters.id"),
            nullable=True,
        ),
    )
    op.create_index("ix_raw_posts_search_id", "raw_posts", ["search_id"])
    op.create_index("ix_raw_posts_cluster_id", "raw_posts", ["cluster_id"])  # M7

    # --- prd_drafts ---
    op.create_table(
        "prd_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pain_clusters.id"),
            unique=True,
            nullable=False,
        ),
        sa.Column("product_concept", sa.Text(), nullable=True),
        sa.Column("target_user", sa.Text(), nullable=True),
        sa.Column("problem_statement", sa.Text(), nullable=True),
        sa.Column("core_features", sa.JSON(), nullable=True),
        sa.Column("mvp_suggestion", sa.Text(), nullable=True),
        sa.Column("full_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("prd_drafts")
    op.drop_index("ix_raw_posts_cluster_id", table_name="raw_posts")
    op.drop_index("ix_raw_posts_search_id", table_name="raw_posts")
    op.drop_table("raw_posts")
    op.drop_index("ix_pain_clusters_search_id", table_name="pain_clusters")
    op.drop_table("pain_clusters")
    op.drop_index("ix_searches_workspace_id", table_name="searches")
    op.drop_index("ix_searches_query", table_name="searches")
    op.drop_table("searches")
    op.drop_table("workspaces")
