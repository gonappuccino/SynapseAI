"""create nodes and edges tables

Revision ID: 001
Revises: None
Create Date: 2026-03-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "nodes",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False, index=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("notation", sa.Text(), nullable=True),
        sa.Column("protected_identifiers", sa.JSON(), nullable=True),
        *([sa.Column("vector_embedding", Vector(768), nullable=True)] if HAS_PGVECTOR else []),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.0"),
    )

    op.create_table(
        "edges",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False, index=True),
        sa.Column("source_id", sa.UUID(), sa.ForeignKey("nodes.id"), nullable=False),
        sa.Column("target_id", sa.UUID(), sa.ForeignKey("nodes.id"), nullable=False),
        sa.Column("relation_type", sa.String(32), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("edges")
    op.drop_table("nodes")
