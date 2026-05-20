import asyncio
import sys
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.chats import router as chats_router
from routes.feedback import router as feedback_router
from routes.jira import router as jira_router
from routes.tickets import router as tickets_router
from routes.uploads import router as uploads_router
from routes.chat_websocket import router as chat_websocket_router
from config import (
    DATABASE_URL,
    EXECUTIVE_REPORT_DAY_OF_WEEK,
    EXECUTIVE_REPORT_ENABLE_SCHEDULER,
    EXECUTIVE_REPORT_HOUR_UTC,
    MOCK_MODE,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Executive Report Agent — weekly cron-style scheduler (Part 2)
#
# This block exists exclusively for the admin-only executive-report feature.
# It does not touch any other route, model, workflow, or service. The
# scheduler can be disabled with ``EXECUTIVE_REPORT_ENABLE_SCHEDULER=false``
# in the environment, in which case admins can still run the report
# manually via the admin endpoint.
# ---------------------------------------------------------------------------


_executive_report_task: asyncio.Task | None = None


async def _executive_report_scheduler_loop() -> None:
    sched_log = logging.getLogger("executive_report.scheduler")
    sched_log.info(
        "Executive-report scheduler armed: dayOfWeek=%s hourUTC=%s",
        EXECUTIVE_REPORT_DAY_OF_WEEK,
        EXECUTIVE_REPORT_HOUR_UTC,
    )
    # Local import keeps the import graph stable even if the executive
    # report service has its own optional dependencies in the future.
    from services.executive_report_service import send_executive_reports

    while True:
        try:
            now = datetime.now(timezone.utc)
            if (
                now.weekday() == EXECUTIVE_REPORT_DAY_OF_WEEK
                and now.hour == EXECUTIVE_REPORT_HOUR_UTC
            ):
                # The service has a per-admin per-ISO-week idempotency
                # guard, so calling repeatedly within the same hour is
                # safe — duplicate admins are silently skipped.
                await asyncio.to_thread(send_executive_reports)
        except Exception:
            sched_log.exception("Executive-report scheduler tick failed")
        # Hourly tick — fine-grained enough to hit any configured hour
        # while keeping the loop cheap.
        await asyncio.sleep(3600)


def _start_executive_report_scheduler() -> None:
    global _executive_report_task
    if not EXECUTIVE_REPORT_ENABLE_SCHEDULER:
        return
    if _executive_report_task is not None:
        return
    _executive_report_task = asyncio.create_task(_executive_report_scheduler_loop())


async def _stop_executive_report_scheduler() -> None:
    global _executive_report_task
    if _executive_report_task is None:
        return
    _executive_report_task.cancel()
    try:
        await _executive_report_task
    except asyncio.CancelledError:
        pass
    _executive_report_task = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not MOCK_MODE:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        async with AsyncPostgresSaver.from_conn_string(
            DATABASE_URL.replace("+psycopg", "")
        ) as checkpointer:
            await checkpointer.setup()
            log.info("AsyncPostgresSaver tables verified/created.")
    _start_executive_report_scheduler()
    try:
        yield
    finally:
        await _stop_executive_report_scheduler()


app = FastAPI(title="RUAG Smart Feedback Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chats_router)
app.include_router(uploads_router)
app.include_router(tickets_router)
app.include_router(feedback_router)
app.include_router(jira_router)
app.include_router(chat_websocket_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}
