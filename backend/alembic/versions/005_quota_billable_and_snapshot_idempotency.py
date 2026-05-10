"""Add quota billing flag and make weekly snapshots idempotent.

Revision ID: 005
Revises: 004
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "searches",
        sa.Column(
            "is_quota_billable",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_searches_is_quota_billable",
        "searches",
        ["is_quota_billable"],
    )

    # Keep the newest retry-generated row for each weekly niche/cluster point
    # before enforcing idempotency.
    op.execute(
        """
        DELETE FROM cluster_snapshots
        WHERE id IN (
            SELECT id
            FROM (
                SELECT
                    id,
                    row_number() OVER (
                        PARTITION BY niche, iso_year, iso_week, cluster_label_norm
                        ORDER BY created_at DESC NULLS LAST, id DESC
                    ) AS rn
                FROM cluster_snapshots
            ) ranked
            WHERE ranked.rn > 1
        )
        """
    )
    op.create_unique_constraint(
        "uq_cluster_snapshots_niche_week_label",
        "cluster_snapshots",
        ["niche", "iso_year", "iso_week", "cluster_label_norm"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_cluster_snapshots_niche_week_label",
        "cluster_snapshots",
        type_="unique",
    )
    op.drop_index("ix_searches_is_quota_billable", table_name="searches")
    op.drop_column("searches", "is_quota_billable")
