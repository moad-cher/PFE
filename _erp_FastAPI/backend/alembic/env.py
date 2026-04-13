import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ------------------------------------------------------------------ #
#  Import Base + all models so Alembic can detect them                #
# ------------------------------------------------------------------ #
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.base import Base
# import app.models  # noqa: F401 — registers all models on Base.metadata

# ------------------------------------------------------------------ #
#  Alembic config                                                      #
# ------------------------------------------------------------------ #
config = context.config
fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override the URL from .env so we only maintain one source of truth
from app.core.config import settings

# Keep asyncpg in the URL — async_engine_from_config will use it directly
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


# ------------------------------------------------------------------ #
#  Offline migrations (no live DB connection)                          #
# ------------------------------------------------------------------ #
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ------------------------------------------------------------------ #
#  Online migrations (async engine)                                    #
# ------------------------------------------------------------------ #
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
