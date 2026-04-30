"""make_task_story_id_mandatory

Revision ID: e1f2d3c4b5a6
Revises: fd6de91edb29
Create Date: 2026-04-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2d3c4b5a6'
down_revision: Union[str, None] = 'fd6de91edb29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Delete tasks without a story
    op.execute("DELETE FROM tasks WHERE story_id IS NULL")
    
    # 2. Update foreign key to CASCADE
    # We try to drop with standard name, but since it was None in creation, we might need to check.
    # However, 'tasks_story_id_fkey' is the standard Alembic/SQLAlchemy naming.
    op.drop_constraint('tasks_story_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key('tasks_story_id_fkey', 'tasks', 'stories', ['story_id'], ['id'], ondelete='CASCADE')
    
    # 3. Make nullable=False
    op.alter_column('tasks', 'story_id',
               existing_type=sa.INTEGER(),
               nullable=False)


def downgrade() -> None:
    op.alter_column('tasks', 'story_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.drop_constraint('tasks_story_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key('tasks_story_id_fkey', 'tasks', 'stories', ['story_id'], ['id'], ondelete='SET NULL')
