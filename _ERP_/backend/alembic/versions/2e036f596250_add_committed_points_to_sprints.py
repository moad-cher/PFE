"""add committed_points to sprints

Revision ID: 2e036f596250
Revises: f551fe08cf50
Create Date: 2026-05-04 10:48:27.157387

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e036f596250'
down_revision: Union[str, None] = 'f551fe08cf50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sprints', sa.Column('committed_points', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('sprints', 'committed_points')
