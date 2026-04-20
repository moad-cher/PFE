"""replace task deadline with timestamps

Revision ID: 8a5d9f6c4b21
Revises: 4731956f9052
Create Date: 2026-04-20 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a5d9f6c4b21'
down_revision: Union[str, None] = '4731956f9052'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('start_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('end_time', sa.DateTime(timezone=True), nullable=True))

    op.execute(
        """
        UPDATE tasks
        SET end_time = (deadline::timestamp + INTERVAL '23 hours 59 minutes 59 seconds') AT TIME ZONE 'UTC'
        WHERE deadline IS NOT NULL
        """
    )

    op.drop_column('tasks', 'time_slot')
    op.drop_column('tasks', 'deadline')


def downgrade() -> None:
    op.add_column('tasks', sa.Column('deadline', sa.Date(), nullable=True))
    op.add_column('tasks', sa.Column('time_slot', sa.String(length=20), nullable=False, server_default=''))

    op.execute(
        """
        UPDATE tasks
        SET deadline = (end_time AT TIME ZONE 'UTC')::date
        WHERE end_time IS NOT NULL
        """
    )

    op.alter_column('tasks', 'time_slot', server_default=None)
    op.drop_column('tasks', 'end_time')
    op.drop_column('tasks', 'start_time')