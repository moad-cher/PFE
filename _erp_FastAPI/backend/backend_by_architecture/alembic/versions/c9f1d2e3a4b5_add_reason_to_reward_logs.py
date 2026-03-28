"""add_reason_to_reward_logs

Revision ID: c9f1d2e3a4b5
Revises: 8716cb29b15f
Create Date: 2026-03-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9f1d2e3a4b5'
down_revision: Union[str, None] = '8716cb29b15f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reward_logs', sa.Column('reason', sa.String(200), nullable=False, server_default=''))


def downgrade() -> None:
    op.drop_column('reward_logs', 'reason')
