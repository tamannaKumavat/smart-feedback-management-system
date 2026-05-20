"""Read-only aggregation helpers for the admin (Organization) dashboard.

These functions target the production Supabase schema (``issues``,
``tickets``, ``messages``, ``users``) using raw SQL so the implementation
stays decoupled from the local SQLAlchemy models, which describe the
older ``chats`` shape and do not include the extended ticket columns
(``team``, ``issue_type``, ``priority`` etc.).

All endpoints that consume these helpers are admin-only — gating happens
in the route layer (``services.security.get_current_user`` + role check).

Period semantics
----------------

"This week" = the ISO week containing today (Monday 00:00 UTC inclusive
through next Monday 00:00 UTC exclusive). "Last week" = the ISO week
immediately before. The same boundary helper is reused everywhere so all
KPI cards agree on the same window.
"""

from __future__ import annotations

from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


# ---------------------------------------------------------------------------
# Constants and helpers
# ---------------------------------------------------------------------------

# Statuses considered "resolved" across both ``issues`` and ``tickets``.
# We accept several spellings because Supabase ``tickets`` mirrors Jira
# ("Done", "Resolved", "Closed") while ``issues`` uses lowercase.
RESOLVED_STATUSES = {"resolved", "closed", "done", "completed"}

# Issue types we surface in the breakdown. Anything else falls into "Other".
KNOWN_ISSUE_TYPES = {
    "bug": "Bug",
    "feature": "Feature",
    "feature_request": "Feature",
    "question": "Question",
    "complaint": "Other",
    "other": "Other",
}

# Visual palette for the type breakdown — kept here so frontend and backend
# emit the same colour for the same bucket (matches mock data).
TYPE_COLORS = {
    "Bug": "#EF4444",
    "Feature": "#3B82F6",
    "Question": "#A78BFA",
    "Other": "#9CA3AF",
}


def week_bounds(reference: datetime | None = None) -> tuple[datetime, datetime, datetime]:
    """Return (last_week_start, this_week_start, this_week_end) in UTC.

    Boundaries are Monday 00:00:00 UTC. ``this_week_end`` is exclusive.
    """
    now = reference or datetime.now(timezone.utc)
    # Normalise to UTC midnight at start of the day.
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    this_week_start = start_of_today - timedelta(days=start_of_today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    this_week_end = this_week_start + timedelta(days=7)
    return last_week_start, this_week_start, this_week_end


def _safe_scalar(db: Session, sql: str, params: dict[str, Any] | None = None) -> Any:
    """Run a single-value query, returning None on error.

    Empty/early-integration databases or schema drift should produce a
    quiet empty state rather than a 500.
    """
    try:
        result = db.execute(text(sql), params or {}).scalar()
        return result
    except SQLAlchemyError:
        return None


def _safe_rows(db: Session, sql: str, params: dict[str, Any] | None = None) -> list[Any]:
    try:
        return list(db.execute(text(sql), params or {}).mappings())
    except SQLAlchemyError:
        return []


def _delta_pct(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return ((current - previous) / previous) * 100.0


def _format_change(delta_pct: float | None) -> str:
    if delta_pct is None:
        return "—"
    sign = "+" if delta_pct >= 0 else ""
    return f"{sign}{delta_pct:.1f}%"


# ---------------------------------------------------------------------------
# Resolution time / FCR / escalation KPIs
# ---------------------------------------------------------------------------


def _avg_resolution_hours(db: Session, start: datetime, end: datetime) -> float | None:
    """Mean resolution time in hours over [start, end).

    Resolution time is approximated by ``EXTRACT(EPOCH FROM (updated_at -
    created_at)) / 3600`` for ``issues`` whose status is in
    ``RESOLVED_STATUSES`` and whose ``updated_at`` falls in the window.
    """
    sql = """
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0)
        FROM issues
        WHERE LOWER(status) = ANY(:resolved_statuses)
          AND updated_at >= :start
          AND updated_at <  :end
    """
    value = _safe_scalar(
        db,
        sql,
        {
            "resolved_statuses": list(RESOLVED_STATUSES),
            "start": start,
            "end": end,
        },
    )
    return float(value) if value is not None else None


def _fcr_rate(db: Session, start: datetime, end: datetime) -> float | None:
    """First Contact Resolution rate, in [0, 1].

    Definition: among issues resolved in the window, the share whose
    ``resolved_by = 'ai'`` (i.e. handled by the agent without human
    escalation).
    """
    total = _safe_scalar(
        db,
        """
        SELECT COUNT(*) FROM issues
        WHERE LOWER(status) = ANY(:resolved_statuses)
          AND updated_at >= :start
          AND updated_at <  :end
        """,
        {
            "resolved_statuses": list(RESOLVED_STATUSES),
            "start": start,
            "end": end,
        },
    )
    if not total:
        return None
    fcr = _safe_scalar(
        db,
        """
        SELECT COUNT(*) FROM issues
        WHERE LOWER(status) = ANY(:resolved_statuses)
          AND LOWER(COALESCE(resolved_by, '')) = 'ai'
          AND updated_at >= :start
          AND updated_at <  :end
        """,
        {
            "resolved_statuses": list(RESOLVED_STATUSES),
            "start": start,
            "end": end,
        },
    )
    return (fcr or 0) / total


def _escalation_rate(db: Session, start: datetime, end: datetime) -> float | None:
    """Share of issues created in the window that ended up escalated.

    Definition: an issue is "escalated" when it produced a ticket whose
    priority is High or Critical, or whose ``resolved_by`` is ``human``
    (i.e. the AI agent could not handle it alone).
    """
    total = _safe_scalar(
        db,
        """
        SELECT COUNT(*) FROM issues
        WHERE created_at >= :start AND created_at < :end
        """,
        {"start": start, "end": end},
    )
    if not total:
        return None
    escalated = _safe_scalar(
        db,
        """
        SELECT COUNT(DISTINCT i.id)
        FROM issues i
        LEFT JOIN tickets t ON t.issue_id = i.id
        WHERE i.created_at >= :start AND i.created_at < :end
          AND (
              LOWER(COALESCE(i.resolved_by, '')) = 'human'
              OR LOWER(COALESCE(t.priority, '')) IN ('high', 'critical')
          )
        """,
        {"start": start, "end": end},
    )
    return (escalated or 0) / total


def kpi_summary(db: Session, *, admin_user_id: str | None = None) -> dict[str, Any]:
    """All KPI cards in one payload (avg resolution / FCR / escalation).

    The frontend KPI cards consume ``value``, ``change`` and
    ``isImprovement`` directly; ``rawValue`` and ``rawDelta`` are
    integration-friendly numerics for downstream tooling.
    """
    last_start, this_start, this_end = week_bounds()

    avg_curr = _avg_resolution_hours(db, this_start, this_end)
    avg_prev = _avg_resolution_hours(db, last_start, this_start)
    avg_delta = _delta_pct(avg_curr, avg_prev)

    fcr_curr = _fcr_rate(db, this_start, this_end)
    fcr_prev = _fcr_rate(db, last_start, this_start)
    fcr_delta = (
        ((fcr_curr - fcr_prev) * 100.0)
        if fcr_curr is not None and fcr_prev is not None
        else None
    )

    esc_curr = _escalation_rate(db, this_start, this_end)
    esc_prev = _escalation_rate(db, last_start, this_start)
    esc_delta = (
        ((esc_curr - esc_prev) * 100.0)
        if esc_curr is not None and esc_prev is not None
        else None
    )

    return {
        "weekStart": this_start.isoformat(),
        "weekEnd": this_end.isoformat(),
        "avgResolution": {
            "id": "avgResolve",
            "title": "Average Time to Resolve",
            "subtitle": "This Week",
            "value": f"{avg_curr:.1f} Hours" if avg_curr is not None else "—",
            "rawValue": avg_curr,
            "change": _format_change(avg_delta),
            "rawDelta": avg_delta,
            # Resolution time falling = improvement.
            "isImprovement": (avg_delta is not None and avg_delta < 0),
        },
        "fcr": {
            "id": "fcr",
            "title": "First Contact Resolution",
            "subtitle": "This Week",
            "value": f"{fcr_curr * 100:.0f}%" if fcr_curr is not None else "—",
            "rawValue": fcr_curr,
            "change": _format_change(fcr_delta),
            "rawDelta": fcr_delta,
            # FCR rising = improvement.
            "isImprovement": (fcr_delta is not None and fcr_delta > 0),
        },
        "escalation": {
            "id": "escalation",
            "title": "Escalation Rate",
            "subtitle": "This Week",
            "value": f"{esc_curr * 100:.0f}%" if esc_curr is not None else "—",
            "rawValue": esc_curr,
            "change": _format_change(esc_delta),
            "rawDelta": esc_delta,
            # Escalation falling = improvement.
            "isImprovement": (esc_delta is not None and esc_delta < 0),
        },
    }


# ---------------------------------------------------------------------------
# Summary cards (totals)
# ---------------------------------------------------------------------------


def summary_cards(db: Session) -> list[dict[str, Any]]:
    """Top-of-dashboard summary cards.

    Currently a single card: ``Total Tickets`` is the count of all issues
    created up to now, with a week-over-week delta and a six-week
    sparkline trend.
    """
    last_start, this_start, this_end = week_bounds()

    total_now = _safe_scalar(db, "SELECT COUNT(*) FROM issues") or 0
    total_this_week = (
        _safe_scalar(
            db,
            "SELECT COUNT(*) FROM issues WHERE created_at >= :s AND created_at < :e",
            {"s": this_start, "e": this_end},
        )
        or 0
    )
    total_last_week = (
        _safe_scalar(
            db,
            "SELECT COUNT(*) FROM issues WHERE created_at >= :s AND created_at < :e",
            {"s": last_start, "e": this_start},
        )
        or 0
    )
    total_delta = _delta_pct(float(total_this_week), float(total_last_week))

    return [
        {
            "id": "totalTickets",
            "title": "Total Tickets",
            "value": int(total_now),
            "change": _format_change(total_delta),
            "trend": _last_six_weeks_counts(db, "issues", "created_at"),
        },
    ]


def _last_six_weeks_counts(db: Session, table: str, date_col: str) -> list[int]:
    """Tiny sparkline series — counts in each of the last six ISO weeks."""
    _, this_start, _ = week_bounds()
    out: list[int] = []
    for offset in range(5, -1, -1):
        win_start = this_start - timedelta(days=7 * offset)
        win_end = win_start + timedelta(days=7)
        c = (
            _safe_scalar(
                db,
                f"SELECT COUNT(*) FROM {table} WHERE {date_col} >= :s AND {date_col} < :e",
                {"s": win_start, "e": win_end},
            )
            or 0
        )
        out.append(int(c))
    return out


# ---------------------------------------------------------------------------
# Active tickets table & status breakdown
# ---------------------------------------------------------------------------


def _normalise_status(raw: Any) -> str:
    s = str(raw or "").strip().lower()
    if s in RESOLVED_STATUSES:
        return "resolved"
    if s in {"to do", "todo", "open", "new", "unassigned"}:
        return "unassigned"
    if s in {"in progress", "in-progress", "pending", "waiting"}:
        return "pending"
    return s or "unassigned"


def active_tickets(db: Session, limit: int = 20) -> list[dict[str, Any]]:
    rows = _safe_rows(
        db,
        """
        SELECT case_id, summary, team, status, created_at
        FROM tickets
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        created_at: datetime | None = row.get("created_at")
        out.append(
            {
                "id": row.get("case_id"),
                "date": created_at.strftime("%-d %b %Y") if isinstance(created_at, datetime) else "",
                "description": row.get("summary") or "",
                "team": row.get("team") or "Unassigned",
                "status": _normalise_status(row.get("status")),
            }
        )
    return out


def status_breakdown(db: Session) -> dict[str, Any]:
    rows = _safe_rows(
        db,
        "SELECT status, COUNT(*) AS n FROM issues GROUP BY status",
    )
    buckets = {"pending": 0, "unassigned": 0, "resolved": 0}
    for row in rows:
        status = _normalise_status(row.get("status"))
        if status in buckets:
            buckets[status] += int(row.get("n") or 0)
        else:
            buckets["unassigned"] += int(row.get("n") or 0)
    grand_total = sum(buckets.values())
    if grand_total == 0:
        return {"grandTotal": 0, "list": []}
    return {
        "grandTotal": grand_total,
        "list": [
            {"label": "In progress", "value": round(buckets["pending"] / grand_total * 100)},
            {"label": "Received", "value": round(buckets["unassigned"] / grand_total * 100)},
            {"label": "Resolved", "value": round(buckets["resolved"] / grand_total * 100)},
        ],
    }


# ---------------------------------------------------------------------------
# Ticket volume over time
# ---------------------------------------------------------------------------


def ticket_volume_over_time(db: Session, weeks: int = 8) -> list[dict[str, Any]]:
    """Per-week incoming and resolved counts for the last ``weeks`` weeks."""
    _, this_start, _ = week_bounds()
    out: list[dict[str, Any]] = []
    for offset in range(weeks - 1, -1, -1):
        win_start = this_start - timedelta(days=7 * offset)
        win_end = win_start + timedelta(days=7)
        incoming = (
            _safe_scalar(
                db,
                "SELECT COUNT(*) FROM issues WHERE created_at >= :s AND created_at < :e",
                {"s": win_start, "e": win_end},
            )
            or 0
        )
        resolved = (
            _safe_scalar(
                db,
                """
                SELECT COUNT(*) FROM issues
                WHERE LOWER(status) = ANY(:resolved_statuses)
                  AND updated_at >= :s AND updated_at < :e
                """,
                {
                    "resolved_statuses": list(RESOLVED_STATUSES),
                    "s": win_start,
                    "e": win_end,
                },
            )
            or 0
        )
        # Label as W1..Wn where Wn is the most recent week.
        label_idx = weeks - offset
        out.append(
            {
                "week": f"W{label_idx}",
                "incoming": int(incoming),
                "resolved": int(resolved),
            }
        )
    return out


# ---------------------------------------------------------------------------
# Team workload distribution
# ---------------------------------------------------------------------------


def team_workload(db: Session) -> list[dict[str, Any]]:
    rows = _safe_rows(
        db,
        """
        SELECT
            COALESCE(team, 'Unassigned') AS team,
            SUM(
                CASE
                    WHEN LOWER(status) = ANY(:resolved_statuses) THEN 0
                    ELSE 1
                END
            ) AS open_count,
            SUM(
                CASE
                    WHEN LOWER(status) = ANY(:resolved_statuses) THEN 1
                    ELSE 0
                END
            ) AS resolved_count
        FROM tickets
        GROUP BY team
        ORDER BY (
            SUM(
                CASE WHEN LOWER(status) = ANY(:resolved_statuses) THEN 0 ELSE 1 END
            )
            + SUM(
                CASE WHEN LOWER(status) = ANY(:resolved_statuses) THEN 1 ELSE 0 END
            )
        ) DESC
        """,
        {"resolved_statuses": list(RESOLVED_STATUSES)},
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "team": row.get("team") or "Unassigned",
                "open": int(row.get("open_count") or 0),
                "resolved": int(row.get("resolved_count") or 0),
            }
        )
    return out


# ---------------------------------------------------------------------------
# Ticket type breakdown
# ---------------------------------------------------------------------------


def ticket_type_breakdown(db: Session) -> list[dict[str, Any]]:
    """Distribution of tickets by ``issue_type``, in the current ISO week."""
    _, this_start, this_end = week_bounds()
    rows = _safe_rows(
        db,
        """
        SELECT COALESCE(LOWER(issue_type), 'other') AS issue_type, COUNT(*) AS n
        FROM tickets
        WHERE created_at >= :s AND created_at < :e
        GROUP BY COALESCE(LOWER(issue_type), 'other')
        """,
        {"s": this_start, "e": this_end},
    )
    bucketed: "OrderedDict[str, int]" = OrderedDict(
        [("Bug", 0), ("Feature", 0), ("Question", 0), ("Other", 0)]
    )
    for row in rows:
        raw_type = str(row.get("issue_type") or "other")
        label = KNOWN_ISSUE_TYPES.get(raw_type, "Other")
        bucketed[label] += int(row.get("n") or 0)

    return [
        {"type": label, "value": value, "color": TYPE_COLORS[label]}
        for label, value in bucketed.items()
    ]


# ---------------------------------------------------------------------------
# Solved tickets by department
# ---------------------------------------------------------------------------


def solved_tickets_by_department(db: Session) -> list[dict[str, Any]]:
    rows = _safe_rows(
        db,
        """
        SELECT
            COALESCE(team, 'Unassigned') AS team,
            COUNT(*) AS total,
            SUM(
                CASE WHEN LOWER(status) = ANY(:resolved_statuses) THEN 1 ELSE 0 END
            ) AS resolved
        FROM tickets
        GROUP BY team
        ORDER BY team
        """,
        {"resolved_statuses": list(RESOLVED_STATUSES)},
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        total = int(row.get("total") or 0)
        resolved = int(row.get("resolved") or 0)
        if total == 0:
            continue
        pct = round(resolved / total * 100)
        out.append(
            {
                "id": (row.get("team") or "unassigned").lower().replace(" ", "_"),
                "name": row.get("team") or "Unassigned",
                "solvedPct": pct,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Customer satisfaction (placeholder)
# ---------------------------------------------------------------------------


def customer_satisfaction(db: Session) -> dict[str, Any]:
    """Placeholder: there is no satisfaction table in the current schema.

    The frontend keeps reading from mock data; this endpoint exists so a
    developer can later swap in a real survey/sentiment source without
    changing the response shape. ``breakdown`` values are percentages
    that sum to 100 once a real source is wired up; ``greatPercent``
    equals Happy + Good.
    """
    return {
        "totalReceived": 0,
        "greatPercent": 0,
        "breakdown": [
            {"label": "Happy", "value": 0, "color": "#34D399"},
            {"label": "Good", "value": 0, "color": "#FBBF24"},
            {"label": "Sad", "value": 0, "color": "#F87171"},
        ],
    }
