"""add_invitations_table

Revision ID: 509650e43f6d
Revises: bf2818040bfe
Create Date: 2026-10-26 22:08:30.157852

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '509650e43f6d'
down_revision: Union[str, Sequence[str], None] = 'bf2818040bfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'invitations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('invited_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index(op.f('ix_invitations_workspace_id'), 'invitations', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_invitations_email'), 'invitations', ['email'], unique=False)
    op.create_index(op.f('ix_invitations_token_hash'), 'invitations', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_invitations_token_hash'), table_name='invitations')
    op.drop_index(op.f('ix_invitations_email'), table_name='invitations')
    op.drop_index(op.f('ix_invitations_workspace_id'), table_name='invitations')
    op.drop_table('invitations')
