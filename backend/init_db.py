"""Initialize the database schema.

Creates all tables defined in the SQLAlchemy models. Safe to re-run; existing
tables and data are left untouched.

Run from the backend directory:

    python init_db.py
"""

from __future__ import annotations

import logging

# Importing the models package registers every model on Base.metadata.
import models  # noqa: F401
from db import Base, engine
from sqlalchemy import inspect, text

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def create_tables() -> None:
    log.info("Creating tables (if missing)...")
    Base.metadata.create_all(bind=engine)
    ensure_ticket_extra_columns()
    log.info("Tables ready.")


def ensure_ticket_extra_columns() -> None:
    inspector = inspect(engine)
    if "tickets" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("tickets")}
    with engine.begin() as connection:
        if "response" not in columns:
            log.info("Adding missing tickets.response column...")
            connection.execute(text("ALTER TABLE tickets ADD COLUMN response TEXT"))
        if "response_comments" not in columns:
            log.info("Adding missing tickets.response_comments column...")
            connection.execute(text("ALTER TABLE tickets ADD COLUMN response_comments JSON"))
        if "response_embedding" not in columns:
            log.info("Adding missing tickets.response_embedding column...")
            connection.execute(text("ALTER TABLE tickets ADD COLUMN response_embedding vector(768)"))


def main() -> None:
    create_tables()
    log.info("Done.")


if __name__ == "__main__":
    main()
