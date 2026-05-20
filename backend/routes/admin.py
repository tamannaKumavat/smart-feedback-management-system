"""HTTP controllers for the admin (Organization) dashboard.

Every endpoint here is gated to ``role='admin'`` users via the
:func:`require_admin` dependency. The frontend continues to read mock
data for the demo; these endpoints are the integration target.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.user import User
from services import admin_dashboard_service as dashboard
from services import executive_report_service
from services.security import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------------------------------------------------------------------------
# KPI cards (week-over-week)
# ---------------------------------------------------------------------------


@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Avg resolution time, FCR, and escalation rate — current vs. last week.

    Each card carries a string-formatted ``value``, a ``change`` like
    ``+5.3%`` and an ``isImprovement`` flag so the frontend can colour
    the indicator without needing to know which direction is "good"
    for each metric.
    """
    payload = dashboard.kpi_summary(db)
    return {"ok": True, **payload}


# ---------------------------------------------------------------------------
# Summary cards (totals)
# ---------------------------------------------------------------------------


@router.get("/summary-cards")
def get_summary_cards(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    cards = dashboard.summary_cards(db)
    return {"ok": True, "cards": cards}


# ---------------------------------------------------------------------------
# Active tickets table & status breakdown
# ---------------------------------------------------------------------------


@router.get("/active-tickets")
def get_active_tickets(
    limit: int = 20,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "items": dashboard.active_tickets(db, limit=limit)}


@router.get("/status-breakdown")
def get_status_breakdown(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    payload = dashboard.status_breakdown(db)
    return {"ok": True, **payload}


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------


@router.get("/ticket-volume")
def get_ticket_volume(
    weeks: int = 8,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "timeline": dashboard.ticket_volume_over_time(db, weeks=weeks)}


@router.get("/team-workload")
def get_team_workload(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "items": dashboard.team_workload(db)}


@router.get("/ticket-type-breakdown")
def get_ticket_type_breakdown(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "items": dashboard.ticket_type_breakdown(db)}


@router.get("/solved-by-department")
def get_solved_by_department(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "items": dashboard.solved_tickets_by_department(db)}


@router.get("/customer-satisfaction")
def get_customer_satisfaction(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return {"ok": True, "satisfaction": dashboard.customer_satisfaction(db)}


# ---------------------------------------------------------------------------
# Executive Report Agent — manual trigger (Part 2)
#
# The agent is normally invoked by the weekly scheduler in main.py. This
# endpoint lets an admin run it on demand for the demo, bypassing the
# weekly idempotency guard when ``force=true``.
# ---------------------------------------------------------------------------


@router.post("/executive-report/run")
def run_executive_report(
    force: bool = False,
    admin: User = Depends(require_admin),
):
    result = executive_report_service.send_executive_reports(force=force)
    return {"ok": True, **result}
