"""Add digest_subscribers table for Pain Point Digest newsletter.

Revision ID: 003
Revises: 002
Create Date: 2026-03-27

What this migration does:
- Creates the `digest_subscribers` table (id, email, subscribed, created_at, unsubscribed_at)
- Unique constraint on email so the same address can't subscribe twice
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "digest_subscribers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("subscribed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("unsubscribed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_digest_subscribers_email"),
    )
    op.create_index("ix_digest_subscribers_email", "digest_subscribers", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_digest_subscribers_email", table_name="digest_subscribers")
    op.drop_table("digest_subscribers")
