"""Automated Executive Report Agent (Part 2).

Generates a weekly executive-level summary email for every user with
``role='admin'``, derived from organization data in Supabase, and
delivers it to the admin's registered email.

Pipeline (matches the simplified architecture in the spec — Section 2.2):

    1. weekly cron-style trigger
    2. aggregate metrics from issues / tickets / users
    3. send aggregated payload to the project's watsonx.ai chat model
    4. wrap the model output in a properly formatted RUAG-branded email
    5. send via SMTP (or fall back to writing the HTML to disk in demo
       environments where SMTP is not configured)
    6. record the run for idempotency so the same ISO week is never
       double-sent to the same admin

There is intentionally **no frontend** for this feature, only an
admin-only manual-trigger endpoint exposed via ``backend/routes/admin.py``
so the report can be exercised on demand for the demo.

The aggregation reuses the dashboard service helpers (``services.
admin_dashboard_service``) wherever possible so dashboard and report
agree on metric definitions and week boundaries.
"""

from __future__ import annotations

import json
import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import make_msgid
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from config import (
    EXECUTIVE_REPORT_DASHBOARD_URL,
    EXECUTIVE_REPORT_FROM,
    EXECUTIVE_REPORT_SUBJECT,
    MOCK_MODE,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
    WATSONX_API_KEY,
    WATSONX_MODEL_ID,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
)
from db import SessionLocal
from models.user import User
from services import admin_dashboard_service as dashboard

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).resolve().parents[1]
LOGO_PATH = _BACKEND_DIR / "assets" / "ruag_logo.png"
STATE_DIR = _BACKEND_DIR / "data" / "executive_reports"
STATE_FILE = STATE_DIR / "state.json"


# ---------------------------------------------------------------------------
# Idempotency state
#
# A small JSON file under ``backend/data/executive_reports/state.json``
# tracks the last successful run per admin email. Storing it in the
# database would also work, but a JSON file matches the existing pattern
# used elsewhere in the project (e.g. the Jira ticket dataset) and keeps
# the schema migrations footprint zero.
# ---------------------------------------------------------------------------


def _load_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {"runs": {}}
    try:
        with STATE_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return {"runs": {}}
    if not isinstance(data, dict) or "runs" not in data:
        return {"runs": {}}
    return data


def _save_state(state: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False, sort_keys=True)
    tmp.replace(STATE_FILE)


def _iso_week_key(reference: datetime | None = None) -> str:
    iso_year, iso_week, _ = (reference or datetime.now(timezone.utc)).isocalendar()
    return f"{iso_year:04d}-W{iso_week:02d}"


def _already_sent_this_week(admin_email: str, week_key: str) -> bool:
    state = _load_state()
    last = state.get("runs", {}).get(admin_email.lower())
    return bool(last and last.get("weekKey") == week_key)


def _record_send(admin_email: str, week_key: str, transport: str) -> None:
    state = _load_state()
    state.setdefault("runs", {})[admin_email.lower()] = {
        "weekKey": week_key,
        "sentAt": datetime.now(timezone.utc).isoformat(),
        "transport": transport,
    }
    _save_state(state)


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _summarize_team_workload(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Pull out the team(s) most likely to be a bottleneck.

    Heuristic: a team is a bottleneck when its open count is large
    relative to its resolved count. Returns the top 3 teams by
    open/resolved ratio so the LLM has structured input rather than
    guessing.
    """
    scored: list[tuple[float, dict[str, Any]]] = []
    for row in items:
        open_count = int(row.get("open") or 0)
        resolved_count = int(row.get("resolved") or 0)
        denom = resolved_count if resolved_count > 0 else 1
        ratio = open_count / denom
        scored.append((ratio, row))
    scored.sort(key=lambda t: t[0], reverse=True)
    return {
        "topBottlenecks": [
            {
                "team": row.get("team"),
                "open": int(row.get("open") or 0),
                "resolved": int(row.get("resolved") or 0),
                "openVsResolvedRatio": round(ratio, 2),
            }
            for ratio, row in scored[:3]
        ],
        "all": items,
    }


def _summarize_ticket_types(items: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(int(i.get("value") or 0) for i in items)
    if total == 0:
        return {"topType": None, "share": 0.0, "all": items}
    items_sorted = sorted(items, key=lambda i: int(i.get("value") or 0), reverse=True)
    top = items_sorted[0]
    return {
        "topType": top.get("type"),
        "share": round(int(top.get("value") or 0) / total * 100, 1),
        "all": items,
    }


def aggregate_report_data(db: Session) -> dict[str, Any]:
    """Compute everything the LLM needs to write the executive summary.

    Reuses dashboard service helpers so the email and the dashboard
    cannot drift in metric definitions or week boundaries.
    """
    last_start, this_start, this_end = dashboard.week_bounds()

    kpis = dashboard.kpi_summary(db)
    summary = dashboard.summary_cards(db)
    status = dashboard.status_breakdown(db)
    team_workload = dashboard.team_workload(db)
    ticket_types = dashboard.ticket_type_breakdown(db)
    volume = dashboard.ticket_volume_over_time(db, weeks=4)

    return {
        "weekKey": _iso_week_key(),
        "weekStart": this_start.isoformat(),
        "weekEnd": this_end.isoformat(),
        "previousWeekStart": last_start.isoformat(),
        "kpis": kpis,
        "summaryCards": summary,
        "statusBreakdown": status,
        "teamWorkload": _summarize_team_workload(team_workload),
        "ticketTypes": _summarize_ticket_types(ticket_types),
        "ticketVolume": volume,
    }


# ---------------------------------------------------------------------------
# Prompt assembly + LLM call
# ---------------------------------------------------------------------------


_PROMPT_INSTRUCTIONS = """You are writing a weekly executive summary email for the
management team of an organization that operates the Smart Feedback System.
The reader is a senior leader who is short on time. The summary must be
concise, professional, decision-useful, and free of marketing language.

Write the body in HTML. Use the following four sections, in this order, each
introduced by an <h3> heading:

  1. KPI summary — week-over-week movement of resolution time, FCR,
     escalation rate, and total ticket volume. State which metrics improved
     and which regressed, with the actual numbers.
  2. Team bottlenecks — call out teams whose open/resolved imbalance suggests
     a queue is forming; reference the numeric data.
  3. Trend highlights — the dominant ticket type this week, plus any other
     pattern visible in the volume series.
  4. Closing — a single short paragraph encouraging the reader to open the
     dashboard for the full picture.

Constraints:
  - HTML only; no <html>, <head>, or <body> wrappers.
  - Use <p>, <ul>, <li>, <strong>, <em>. No inline styles, no images.
  - Do not invent numbers. If a metric is unavailable in the input, omit it.
  - Tone: factual, calm, direct. No exclamation marks. No emojis.

Aggregated data for this week (JSON):
"""


def _build_prompt(payload: dict[str, Any]) -> str:
    return _PROMPT_INSTRUCTIONS + json.dumps(payload, indent=2, default=str)


def _generate_summary_html(payload: dict[str, Any]) -> str:
    """Run the prompt through watsonx.ai and return the generated HTML.

    Honors ``MOCK_MODE``: in mock mode this returns a short professional
    placeholder body so the surrounding pipeline (schedule, aggregation,
    email composition, idempotency, transport) can still be exercised
    end-to-end without an LLM call.
    """
    if MOCK_MODE:
        return (
            "<p><em>This is a placeholder mock executive summary generated "
            "while the system is running in MOCK_MODE.</em></p>"
            "<p>In live mode, the configured watsonx.ai model "
            f"(<code>{WATSONX_MODEL_ID}</code>) produces this section "
            "from the aggregated weekly metrics.</p>"
        )

    prompt = _build_prompt(payload)
    try:
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        credentials = Credentials(url=WATSONX_URL, api_key=WATSONX_API_KEY)
        model = ModelInference(
            model_id=WATSONX_MODEL_ID,
            credentials=credentials,
            project_id=WATSONX_PROJECT_ID,
        )
        text = model.generate_text(
            prompt=prompt,
            params={
                "max_new_tokens": 900,
                "min_new_tokens": 50,
                "temperature": 0.3,
            },
        )
        if not isinstance(text, str):
            text = str(text)
        return text.strip() or _fallback_summary_html(payload)
    except Exception as exc:
        log.exception("watsonx.ai inference failed for executive summary: %s", exc)
        return _fallback_summary_html(payload)


def _fallback_summary_html(payload: dict[str, Any]) -> str:
    """Last-resort body if the LLM call fails — keeps the email useful."""
    kpis = payload.get("kpis", {}) or {}
    avg = kpis.get("avgResolution", {}) or {}
    fcr = kpis.get("fcr", {}) or {}
    esc = kpis.get("escalation", {}) or {}
    return (
        "<p>The automated summary could not be generated this week. "
        "Headline figures are below; please open the dashboard for the "
        "full picture.</p>"
        "<ul>"
        f"<li>Average resolution time: <strong>{avg.get('value', '—')}</strong> "
        f"({avg.get('change', '—')})</li>"
        f"<li>First contact resolution: <strong>{fcr.get('value', '—')}</strong> "
        f"({fcr.get('change', '—')})</li>"
        f"<li>Escalation rate: <strong>{esc.get('value', '—')}</strong> "
        f"({esc.get('change', '—')})</li>"
        "</ul>"
    )


# ---------------------------------------------------------------------------
# Email composition
# ---------------------------------------------------------------------------


def _format_period(payload: dict[str, Any]) -> str:
    """Human-friendly date range for the email header."""
    try:
        start = datetime.fromisoformat(payload["weekStart"])
        end = datetime.fromisoformat(payload["weekEnd"]) - timedelta(days=1)
        return f"{start.strftime('%-d %b')} – {end.strftime('%-d %b %Y')}"
    except Exception:
        return payload.get("weekKey", "")


def _wrap_html(*, admin_full_name: str, summary_body_html: str, payload: dict[str, Any], logo_cid: str) -> str:
    """Wrap the LLM body in the RUAG-branded email shell.

    The logo is referenced by Content-ID (cid:) so it renders inline in
    the recipient's mail client without external image hosting.
    """
    period = _format_period(payload)
    dashboard_url = EXECUTIVE_REPORT_DASHBOARD_URL
    safe_name = (admin_full_name or "there").split()[0] if admin_full_name else "there"
    return f"""\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Weekly Executive Summary</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F6FA;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #EEF2F7;">
                <img src="cid:{logo_cid}" alt="RUAG" width="168" style="display:block;height:auto;border:0;outline:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 4px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748B;">
                  Weekly Executive Summary &middot; {period}
                </p>
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0F172A;">
                  Smart Feedback System
                </h1>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.55;color:#334155;">
                  Hi {safe_name}, here is your organization's automated weekly summary.
                </p>
                <div style="font-size:14px;line-height:1.6;color:#0F172A;">
                  {summary_body_html}
                </div>
                <p style="margin:24px 0 0 0;">
                  <a href="{dashboard_url}" style="display:inline-block;padding:10px 16px;border-radius:8px;background-color:#0F172A;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;">
                    Open the dashboard
                  </a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background-color:#F8FAFC;border-top:1px solid #EEF2F7;font-size:12px;color:#64748B;">
                You are receiving this because you are an admin in the Smart Feedback System for RUAG.
                Full details are always available in the
                <a href="{dashboard_url}" style="color:#0F172A;text-decoration:underline;">admin dashboard</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _strip_tags(html: str) -> str:
    """Best-effort plain-text fallback for the multipart/alternative payload."""
    import re

    text = re.sub(r"<\s*br\s*/?\s*>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</\s*p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</\s*li\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compose_email_message(
    *,
    to_email: str,
    to_name: str,
    summary_body_html: str,
    payload: dict[str, Any],
) -> EmailMessage:
    """Produce a fully assembled multipart/related EmailMessage."""
    msg = EmailMessage()
    msg["Subject"] = EXECUTIVE_REPORT_SUBJECT
    msg["From"] = EXECUTIVE_REPORT_FROM
    msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email

    logo_cid = make_msgid(domain="ruag.local")
    cid_value = logo_cid.strip("<>")

    html_body = _wrap_html(
        admin_full_name=to_name,
        summary_body_html=summary_body_html,
        payload=payload,
        logo_cid=cid_value,
    )

    msg.set_content(_strip_tags(html_body))
    msg.add_alternative(html_body, subtype="html")

    if LOGO_PATH.exists():
        with LOGO_PATH.open("rb") as fh:
            logo_bytes = fh.read()
        # Attach to the HTML alternative so the cid: reference resolves.
        html_part = msg.get_payload()[1]
        html_part.add_related(
            logo_bytes,
            maintype="image",
            subtype="png",
            cid=logo_cid,
            filename="ruag_logo.png",
        )
    else:
        log.warning("RUAG logo not found at %s; sending email without logo.", LOGO_PATH)

    return msg


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD)


def _send_via_smtp(msg: EmailMessage) -> None:
    if SMTP_USE_TLS:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(msg)


def _send_via_filesystem(msg: EmailMessage, *, admin_email: str, week_key: str) -> Path:
    """Demo fallback: write the rendered email to disk for inspection."""
    out_dir = STATE_DIR / "outbox"
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_email = admin_email.replace("@", "_at_").replace("/", "_")
    path = out_dir / f"{week_key}__{safe_email}.eml"
    with path.open("wb") as fh:
        fh.write(bytes(msg))
    return path


def deliver(msg: EmailMessage, *, admin_email: str, week_key: str) -> str:
    """Return the transport actually used: ``smtp`` or ``filesystem``."""
    if _smtp_configured():
        _send_via_smtp(msg)
        return "smtp"
    path = _send_via_filesystem(msg, admin_email=admin_email, week_key=week_key)
    log.info("SMTP not configured — wrote executive report to %s", path)
    return "filesystem"


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def _list_admins(db: Session) -> list[User]:
    stmt = select(User).where(User.role == "admin").order_by(User.created_at)
    return list(db.execute(stmt).scalars())


def send_executive_reports(*, force: bool = False) -> dict[str, Any]:
    """Iterate all admin users and send each their weekly summary.

    Returns a structured result describing which admins received the
    report, which were skipped (already sent for this ISO week), and
    which errored.

    ``force=True`` bypasses the per-admin idempotency guard. Useful for
    the manual-trigger admin endpoint.
    """
    week_key = _iso_week_key()
    summary = {
        "weekKey": week_key,
        "sent": [],
        "skipped": [],
        "failed": [],
    }

    db = SessionLocal()
    try:
        admins = _list_admins(db)
        if not admins:
            log.info("No admin users found; executive report run is a no-op.")
            return summary

        for admin in admins:
            if not admin.email:
                summary["failed"].append(
                    {"admin": admin.id, "error": "missing email"}
                )
                continue

            email = admin.email
            if not force and _already_sent_this_week(email, week_key):
                summary["skipped"].append({"email": email, "reason": "already-sent-this-week"})
                continue

            try:
                payload = aggregate_report_data(db)
                summary_html = _generate_summary_html(payload)
                msg = compose_email_message(
                    to_email=email,
                    to_name=admin.full_name or "",
                    summary_body_html=summary_html,
                    payload=payload,
                )
                transport = deliver(msg, admin_email=email, week_key=week_key)
                _record_send(email, week_key, transport)
                summary["sent"].append({"email": email, "transport": transport})
                log.info(
                    "Executive report sent to %s via %s (week %s)",
                    email,
                    transport,
                    week_key,
                )
            except Exception as exc:
                log.exception("Executive report failed for %s: %s", email, exc)
                summary["failed"].append({"email": email, "error": str(exc)})

        return summary
    finally:
        db.close()
