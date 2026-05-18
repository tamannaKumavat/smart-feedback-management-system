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
    ensure_issue_extra_columns()
    backfill_issue_responses()
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


def ensure_issue_extra_columns() -> None:
    inspector = inspect(engine)
    if "issues" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("issues")}
    with engine.begin() as connection:
        if "response" not in columns:
            log.info("Adding missing issues.response column...")
            connection.execute(text("ALTER TABLE issues ADD COLUMN response TEXT"))
        if "response_comments" not in columns:
            log.info("Adding missing issues.response_comments column...")
            connection.execute(text("ALTER TABLE issues ADD COLUMN response_comments JSON"))


def backfill_issue_responses() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "issues" not in table_names or "tickets" not in table_names:
        return

    issue_columns = {column["name"] for column in inspector.get_columns("issues")}
    ticket_columns = {column["name"] for column in inspector.get_columns("tickets")}
    if not {"response", "response_comments"} <= issue_columns:
        return
    if not {"issue_id", "response", "response_comments"} <= ticket_columns:
        return

    log.info("Backfilling missing issue responses from linked tickets...")
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE issues AS issue
                SET
                    response = COALESCE(NULLIF(issue.response, ''), ticket.response),
                    response_comments = COALESCE(issue.response_comments, ticket.response_comments)
                FROM (
                    SELECT DISTINCT ON (issue_id)
                        issue_id,
                        response,
                        response_comments
                    FROM tickets
                    WHERE response IS NOT NULL OR response_comments IS NOT NULL
                    ORDER BY issue_id, updated_at DESC, created_at DESC
                ) AS ticket
                WHERE issue.id = ticket.issue_id
                  AND (
                    issue.response IS NULL
                    OR issue.response = ''
                    OR issue.response_comments IS NULL
                  )
                """
            )
        )


def main() -> None:
    create_tables()
    log.info("Done.")


if __name__ == "__main__":
    main()
