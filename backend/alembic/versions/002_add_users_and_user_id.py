"""Add users table and user_id FK columns to workspaces and searches.

Revision ID: 002
Revises: 001
Create Date: 2026-03-16

What this migration does:
- Creates the `users` table (id, clerk_id, email, created_at)
- Adds nullable `user_id` FK to `workspaces` (ON DELETE CASCADE)
- Adds nullable `user_id` FK to `searches` (ON DELETE CASCADE)

Existing rows keep user_id = NULL — they won't appear in any authenticated
user's account, which cleanly separates demo data from real accounts.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. users table
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("clerk_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clerk_id", name="uq_users_clerk_id"),
    )
    op.create_index("ix_users_clerk_id", "users", ["clerk_id"], unique=True)

    # ------------------------------------------------------------------
    # 2. workspaces.user_id
    # ------------------------------------------------------------------
    op.add_column(
        "workspaces",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_workspaces_user_id",
        "workspaces",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_workspaces_user_id", "workspaces", ["user_id"])

    # ------------------------------------------------------------------
    # 3. searches.user_id
    # ------------------------------------------------------------------
    op.add_column(
        "searches",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_searches_user_id",
        "searches",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_searches_user_id", "searches", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_searches_user_id", table_name="searches")
    op.drop_constraint("fk_searches_user_id", "searches", type_="foreignkey")
    op.drop_column("searches", "user_id")

    op.drop_index("ix_workspaces_user_id", table_name="workspaces")
    op.drop_constraint("fk_workspaces_user_id", "workspaces", type_="foreignkey")
    op.drop_column("workspaces", "user_id")

    op.drop_index("ix_users_clerk_id", table_name="users")
    op.drop_table("users")
