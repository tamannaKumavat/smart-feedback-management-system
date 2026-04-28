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

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def create_tables() -> None:
    log.info("Creating tables (if missing)...")
    Base.metadata.create_all(bind=engine)
    log.info("Tables ready.")


def main() -> None:
    create_tables()
    log.info("Done.")


if __name__ == "__main__":
    main()
