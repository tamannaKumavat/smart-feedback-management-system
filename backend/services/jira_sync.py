import base64
import json
import logging
from json import JSONDecodeError
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen

from config import (
    JIRA_API_TOKEN,
    JIRA_BASE_URL,
    JIRA_DEFAULT_ASSIGNEE_ACCOUNT_ID,
    JIRA_DEFAULT_ISSUE_TYPE,
    JIRA_EMAIL,
    JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID,
    JIRA_FIELD_RECOMMENDED_ACTION_ID,
    JIRA_FIELD_SEVERITY_ID,
    JIRA_FIELD_SOURCE_CASE_ID,
    JIRA_FIELD_TEAM_ID,
    JIRA_FIELD_URGENCY_ID,
    JIRA_PROJECT_KEY,
    JIRA_TEAM_ID_SECURITY,
    JIRA_TEAM_ID_SOFTWARE_DEVELOPMENT,
    JIRA_TEAM_ID_SUPPORT,
)
from db import SessionLocal
from models.chat import Issue, Ticket
from services.ticket_rag_ingest import is_done_status, upsert_done_ticket_rag_chunk

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "jira_ticket_dataset.json"
log = logging.getLogger(__name__)


class JiraConfigError(RuntimeError):
    pass


class JiraApiError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class JiraSyncResult:
    created: list[dict[str, Any]] = field(default_factory=list)
    updated: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "created": self.created,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
        }


def load_ticket_dataset() -> list[dict[str, Any]]:
    with DATASET_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError("jira_ticket_dataset.json must contain a list of tickets.")
    return data


def save_ticket_dataset(records: list[dict[str, Any]]) -> None:
    DATASET_PATH.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def text_to_adf(text: str) -> dict[str, Any]:
    paragraphs = []
    for line in text.splitlines():
        if line.strip():
            paragraphs.append(
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": line}],
                }
            )
        else:
            paragraphs.append({"type": "paragraph"})
    return {"version": 1, "type": "doc", "content": paragraphs or [{"type": "paragraph"}]}


def adf_to_text(node: Any) -> str:
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "\n".join(filter(None, (adf_to_text(item) for item in node)))
    if not isinstance(node, dict):
        return ""
    if node.get("type") == "text":
        return node.get("text", "")
    content = node.get("content", [])
    child_text = [adf_to_text(child) for child in content]
    separator = "\n" if node.get("type") in {"doc", "paragraph", "listItem"} else ""
    return separator.join(text for text in child_text if text)


def sanitize_label(label: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_.-]+", "_", label.strip())
    return sanitized[:255]


def add_text_custom_field(fields: dict[str, Any], field_id: str, value: Any) -> None:
    if field_id and value not in {None, ""}:
        fields[field_id] = str(value)


def add_option_custom_field(fields: dict[str, Any], field_id: str, value: Any) -> None:
    if field_id and value not in {None, ""}:
        fields[field_id] = {"value": str(value)}


def add_adf_custom_field(fields: dict[str, Any], field_id: str, value: Any) -> None:
    if field_id and value not in {None, ""}:
        fields[field_id] = text_to_adf(str(value))


def add_team_custom_field(fields: dict[str, Any], field_id: str, value: Any) -> None:
    team_id = team_field_value(value)
    if field_id and team_id:
        fields[field_id] = team_id


def read_custom_field_value(value: Any) -> Any:
    if isinstance(value, dict) and value.get("type") == "doc":
        return adf_to_text(value).strip()
    if isinstance(value, dict):
        return value.get("value") or value.get("name") or value.get("title")
    return value


def latest_comment_text(issue: dict[str, Any]) -> str | None:
    comments = (((issue.get("fields") or {}).get("comment") or {}).get("comments") or [])
    if not comments:
        return None
    latest = max(comments, key=lambda comment: comment.get("created") or "")
    body = latest.get("body")
    text = adf_to_text(body).strip()
    return text or None


def jira_comment_snapshots(issue: dict[str, Any]) -> list[dict[str, Any]]:
    comments = (((issue.get("fields") or {}).get("comment") or {}).get("comments") or [])
    snapshots = []
    for comment in sorted(comments, key=lambda item: item.get("created") or ""):
        author = comment.get("author") or {}
        body = adf_to_text(comment.get("body")).strip()
        if not body:
            continue
        snapshots.append(
            {
                "id": comment.get("id"),
                "body": body,
                "created": comment.get("created"),
                "updated": comment.get("updated"),
                "author": {
                    "account_id": author.get("accountId"),
                    "display_name": author.get("displayName"),
                    "email": author.get("emailAddress"),
                    "active": author.get("active"),
                },
            }
        )
    return snapshots


def user_snapshot(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "account_id": user.get("accountId"),
        "display_name": user.get("displayName"),
        "email": user.get("emailAddress"),
        "active": user.get("active"),
    }


def named_items(items: list[dict[str, Any]] | None) -> list[str]:
    if not items:
        return []
    return [item.get("name") for item in items if item.get("name")]


def label_value(labels: list[str] | None, prefix: str) -> str | None:
    for label in labels or []:
        if isinstance(label, str) and label.startswith(prefix):
            return label.removeprefix(prefix)
    return None


def severity_field_value(record: dict[str, Any]) -> str | None:
    severity = record.get("severity") or label_value(record.get("labels"), "severity_")
    if severity in {None, ""}:
        return None
    severity = str(severity)
    severity_by_level = {"1": "Low", "2": "Medium", "3": "High"}
    severity_by_s_level = {"S1": "High", "S2": "Medium", "S3": "Low"}
    if severity.upper() in severity_by_s_level:
        return severity_by_s_level[severity.upper()]
    if severity in severity_by_level:
        return severity_by_level[severity]
    return severity.capitalize()


def urgency_field_value(record: dict[str, Any]) -> str | None:
    urgency = record.get("urgency") or label_value(record.get("labels"), "urgency_")
    if urgency in {None, ""}:
        return None
    return str(urgency).capitalize()


def team_field_value(value: Any) -> str | None:
    if value in {None, ""}:
        return None

    team = str(value).strip()
    team_ids = {
        "support": JIRA_TEAM_ID_SUPPORT,
        "software_development": JIRA_TEAM_ID_SOFTWARE_DEVELOPMENT,
        "security": JIRA_TEAM_ID_SECURITY,
    }
    if team in team_ids:
        return team_ids[team] or None

    # Jira's Atlassian Team field expects the Team ID directly.
    if re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", team):
        return team
    return None


def issue_fields_from_record(record: dict[str, Any]) -> dict[str, Any]:
    labels = [sanitize_label(label) for label in record.get("labels", [])]
    labels = [label for label in labels if label]
    fields: dict[str, Any] = {
        "project": {"key": JIRA_PROJECT_KEY},
        "summary": record.get("summary") or record.get("case_id") or "Feedback ticket",
        "description": text_to_adf(record.get("description", "")),
        "issuetype": {"name": JIRA_DEFAULT_ISSUE_TYPE},
        "labels": labels,
    }
    if record.get("priority"):
        fields["priority"] = {"name": record["priority"]}
    if JIRA_DEFAULT_ASSIGNEE_ACCOUNT_ID:
        fields["assignee"] = {"accountId": JIRA_DEFAULT_ASSIGNEE_ACCOUNT_ID}

    add_text_custom_field(fields, JIRA_FIELD_SOURCE_CASE_ID, record.get("case_id"))
    add_option_custom_field(
        fields,
        JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID,
        record.get("issue_type"),
    )
    add_team_custom_field(fields, JIRA_FIELD_TEAM_ID, record.get("team"))
    add_adf_custom_field(
        fields,
        JIRA_FIELD_RECOMMENDED_ACTION_ID,
        record.get("recommended_action"),
    )
    add_option_custom_field(fields, JIRA_FIELD_SEVERITY_ID, severity_field_value(record))
    add_option_custom_field(fields, JIRA_FIELD_URGENCY_ID, urgency_field_value(record))
    return fields


class JiraClient:
    def __init__(self):
        missing = [
            name
            for name, value in {
                "JIRA_BASE_URL": JIRA_BASE_URL,
                "JIRA_EMAIL": JIRA_EMAIL,
                "JIRA_API_TOKEN": JIRA_API_TOKEN,
                "JIRA_PROJECT_KEY": JIRA_PROJECT_KEY,
            }.items()
            if not value
        ]
        if missing:
            raise JiraConfigError(f"Missing Jira configuration: {', '.join(missing)}")

        parsed_base_url = urlparse(JIRA_BASE_URL)
        if parsed_base_url.path not in {"", "/"}:
            raise JiraConfigError(
                "JIRA_BASE_URL must be only the Atlassian site root, for example "
                "https://ibm-lab2026.atlassian.net. Do not include /jira/software/projects/..."
            )

        token = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{JIRA_BASE_URL}{path}"
        if query:
            url = f"{url}?{urlencode(query, doseq=True)}"
        data = json.dumps(body).encode() if body is not None else None
        request = Request(url, data=data, headers=self.headers, method=method)

        try:
            with urlopen(request, timeout=30) as response:
                content = response.read().decode()
                if not content:
                    return {}
                try:
                    return json.loads(content)
                except JSONDecodeError as error:
                    snippet = content.strip().replace("\n", " ")[:500]
                    raise JiraApiError(
                        f"Jira returned a non-JSON response from {path}: {snippet}",
                        response.status,
                    ) from error
        except HTTPError as error:
            detail = error.read().decode()
            raise JiraApiError(detail or error.reason, error.code) from error
        except URLError as error:
            raise JiraApiError(str(error.reason)) from error

    def create_issue(self, record: dict[str, Any]) -> dict[str, Any]:
        return self.request("POST", "/rest/api/3/issue", {"fields": issue_fields_from_record(record)})

    def update_issue(self, issue_id_or_key: str, record: dict[str, Any]) -> dict[str, Any]:
        fields = issue_fields_from_record(record)
        fields.pop("project", None)
        fields.pop("issuetype", None)
        return self.request("PUT", f"/rest/api/3/issue/{issue_id_or_key}", {"fields": fields})

    def get_issue(self, issue_id_or_key: str) -> dict[str, Any]:
        fields = [
            "summary",
            "description",
            "issuetype",
            "priority",
            "status",
            "statuscategorychangedate",
            "labels",
            "assignee",
            "reporter",
            "creator",
            "created",
            "updated",
            "resolution",
            "resolutiondate",
            "comment",
            "components",
            "fixVersions",
            "versions",
            "duedate",
        ]
        fields.extend(
            field_id
            for field_id in [
                JIRA_FIELD_SOURCE_CASE_ID,
                JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID,
                JIRA_FIELD_TEAM_ID,
                JIRA_FIELD_RECOMMENDED_ACTION_ID,
                JIRA_FIELD_SEVERITY_ID,
                JIRA_FIELD_URGENCY_ID,
            ]
            if field_id
        )
        return self.request(
            "GET",
            f"/rest/api/3/issue/{issue_id_or_key}",
            query={"fields": fields},
        )

    def list_fields(self) -> list[dict[str, Any]]:
        return self.request("GET", "/rest/api/3/field")

    def get_comments(self, issue_id_or_key: str) -> list[dict[str, Any]]:
        response = self.request(
            "GET",
            f"/rest/api/3/issue/{issue_id_or_key}/comment",
            query={"orderBy": "-created", "maxResults": 20},
        )
        return response.get("comments", [])


def jira_browse_url(issue_key: str) -> str:
    return f"{JIRA_BASE_URL}/browse/{issue_key}"


def sync_dataset_to_jira() -> JiraSyncResult:
    records = load_ticket_dataset()
    client = JiraClient()
    result = JiraSyncResult()

    for index, record in enumerate(records):
        case_id = record.get("case_id", f"row-{index}")
        issue_ref = record.get("jira_key") or record.get("jira_id")
        try:
            if issue_ref:
                client.update_issue(issue_ref, record)
                issue = client.get_issue(issue_ref)
                update_record_from_issue(record, issue)
                result.updated.append({"case_id": case_id, "jira_key": issue.get("key")})
                continue

            issue = client.create_issue(record)
            record["jira_id"] = issue.get("id")
            record["jira_key"] = issue.get("key")
            record["jira_url"] = jira_browse_url(issue["key"]) if issue.get("key") else ""
            if issue.get("key"):
                issue = client.get_issue(issue["key"])
                update_record_from_issue(record, issue)
            record["jira_synced_at"] = utc_now()
            result.created.append({"case_id": case_id, "jira_key": issue.get("key")})
        except JiraApiError as error:
            result.errors.append(
                {
                    "case_id": case_id,
                    "status_code": error.status_code,
                    "error": str(error),
                }
            )

    if result.created or result.updated:
        save_ticket_dataset(records)
    return result


def update_record_from_issue(record: dict[str, Any], issue: dict[str, Any]) -> None:
    fields = issue.get("fields", {})
    record["summary"] = fields.get("summary") or record.get("summary", "")
    record["description"] = adf_to_text(fields.get("description", "")).strip()
    record["jira_issue_type"] = (fields.get("issuetype") or {}).get("name")
    record["priority"] = (fields.get("priority") or {}).get("name") or record.get("priority")
    record["status"] = (fields.get("status") or {}).get("name") or record.get("status")
    record["jira_status_category"] = (
        ((fields.get("status") or {}).get("statusCategory") or {}).get("name")
        or record.get("jira_status_category")
    )
    record["jira_status_category_changed_at"] = fields.get("statuscategorychangedate") or record.get(
        "jira_status_category_changed_at"
    )
    record["labels"] = fields.get("labels") or record.get("labels", [])
    record["case_id"] = read_custom_field_value(fields.get(JIRA_FIELD_SOURCE_CASE_ID)) or record.get(
        "case_id"
    )
    record["issue_type"] = read_custom_field_value(
        fields.get(JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID)
    ) or record.get("issue_type")
    record["team"] = read_custom_field_value(fields.get(JIRA_FIELD_TEAM_ID)) or record.get("team")
    record["recommended_action"] = read_custom_field_value(
        fields.get(JIRA_FIELD_RECOMMENDED_ACTION_ID)
    ) or record.get("recommended_action")
    record["severity"] = read_custom_field_value(fields.get(JIRA_FIELD_SEVERITY_ID)) or record.get(
        "severity"
    )
    record["urgency"] = read_custom_field_value(fields.get(JIRA_FIELD_URGENCY_ID)) or record.get(
        "urgency"
    )
    assignee = fields.get("assignee") or {}
    record["assignee"] = assignee.get("displayName") or assignee.get("accountId")
    record["jira_assignee"] = user_snapshot(fields.get("assignee"))
    record["jira_reporter"] = user_snapshot(fields.get("reporter"))
    record["jira_creator"] = user_snapshot(fields.get("creator"))
    record["jira_created_at"] = fields.get("created") or record.get("jira_created_at")
    record["jira_resolution"] = (fields.get("resolution") or {}).get("name")
    record["jira_resolved_at"] = fields.get("resolutiondate")
    record["jira_components"] = named_items(fields.get("components"))
    record["jira_fix_versions"] = named_items(fields.get("fixVersions"))
    record["jira_affects_versions"] = named_items(fields.get("versions"))
    record["jira_due_date"] = fields.get("duedate")
    record["jira_id"] = issue.get("id") or record.get("jira_id")
    record["jira_key"] = issue.get("key") or record.get("jira_key")
    if record.get("jira_key"):
        record["jira_url"] = jira_browse_url(record["jira_key"])
    record["jira_updated_at"] = fields.get("updated") or record.get("jira_updated_at")
    record["jira_synced_at"] = utc_now()


def sync_dataset_from_jira() -> JiraSyncResult:
    records = load_ticket_dataset()
    client = JiraClient()
    result = JiraSyncResult()

    for index, record in enumerate(records):
        case_id = record.get("case_id", f"row-{index}")
        issue_ref = record.get("jira_key") or record.get("jira_id")
        if not issue_ref:
            result.skipped.append({"case_id": case_id, "reason": "not linked to Jira"})
            continue

        try:
            issue = client.get_issue(issue_ref)
            update_record_from_issue(record, issue)
            result.updated.append({"case_id": case_id, "jira_key": issue.get("key")})
        except JiraApiError as error:
            result.errors.append(
                {
                    "case_id": case_id,
                    "jira_key": issue_ref,
                    "status_code": error.status_code,
                    "error": str(error),
                }
            )

    if result.updated:
        save_ticket_dataset(records)
    return result


def apply_jira_webhook(payload: dict[str, Any]) -> dict[str, Any]:
    issue = payload.get("issue") or {}
    issue_key = issue.get("key")
    issue_id = issue.get("id")
    if not issue_key and not issue_id:
        return {"updated": False, "reason": "payload did not contain an issue"}

    issue_ref = issue_key or issue_id
    try:
        client = JiraClient()
        issue = client.get_issue(issue_ref)
        issue.setdefault("fields", {})["comment"] = {"comments": client.get_comments(issue_ref)}
    except (JiraConfigError, JiraApiError) as error:
        log.warning("Jira webhook could not refresh issue %s: %s", issue_ref, error)

    ticket_db_result = update_ticket_db_from_issue(issue)
    log.info("Jira webhook processed issue=%s result=%s", issue_ref, ticket_db_result)

    return {
        "updated": ticket_db_result.get("updated"),
        "jira_key": issue.get("key") or issue_key,
        "ticket_db": ticket_db_result,
    }


def update_ticket_db_from_issue(issue: dict[str, Any]) -> dict[str, Any]:
    fields = issue.get("fields") or {}
    issue_key = issue.get("key")

    if not JIRA_FIELD_SOURCE_CASE_ID:
        return {
            "updated": False,
            "reason": "JIRA_FIELD_SOURCE_CASE_ID is not configured",
            "jira_key": issue_key,
        }

    ticket_id = read_custom_field_value(fields.get(JIRA_FIELD_SOURCE_CASE_ID))
    if not ticket_id:
        return {
            "updated": False,
            "reason": "Jira issue does not include a source case id",
            "jira_key": issue_key,
        }

    db = SessionLocal()
    try:
        ticket = db.get(Ticket, str(ticket_id))
        if ticket is None:
            return {
                "updated": False,
                "reason": "source case id does not match a ticket row",
                "jira_key": issue_key,
                "case_id": ticket_id,
            }

        changed_fields: list[str] = []

        def set_if_changed(attr: str, value: Any) -> None:
            if value is not None and getattr(ticket, attr) != value:
                setattr(ticket, attr, value)
                changed_fields.append(attr)

        linked_issue = db.get(Issue, ticket.issue_id)

        def set_issue_if_changed(attr: str, value: Any) -> None:
            if (
                linked_issue is not None
                and value is not None
                and getattr(linked_issue, attr) != value
            ):
                setattr(linked_issue, attr, value)
                changed_fields.append(f"issue.{attr}")

        latest_response = latest_comment_text(issue)
        response_comments = jira_comment_snapshots(issue)

        set_if_changed("summary", fields.get("summary"))
        set_if_changed(
            "description",
            adf_to_text(fields.get("description", "")).strip(),
        )
        set_if_changed("priority", (fields.get("priority") or {}).get("name"))
        set_if_changed("status", (fields.get("status") or {}).get("name"))
        set_if_changed("response", latest_response)
        set_if_changed("response_comments", response_comments)
        set_issue_if_changed("response", latest_response)
        set_issue_if_changed("response_comments", response_comments)
        set_if_changed("labels", fields.get("labels") or [])
        set_if_changed(
            "issue_type",
            read_custom_field_value(fields.get(JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID))
            or (fields.get("issuetype") or {}).get("name"),
        )
        set_if_changed(
            "team",
            read_custom_field_value(fields.get(JIRA_FIELD_TEAM_ID)),
        )
        set_if_changed(
            "recommended_action",
            read_custom_field_value(fields.get(JIRA_FIELD_RECOMMENDED_ACTION_ID)),
        )
        assignee = fields.get("assignee") or {}
        set_if_changed("assignee", assignee.get("displayName") or assignee.get("accountId"))

        if changed_fields:
            db.commit()
            db.refresh(ticket)

        rag_ingest = {"upserted": False, "reason": "ticket is not done"}
        if is_done_status(ticket.status):
            try:
                rag_ingest = upsert_done_ticket_rag_chunk(db, ticket)
            except Exception as error:
                db.rollback()
                rag_ingest = {
                    "upserted": False,
                    "reason": str(error),
                    "case_id": ticket.case_id,
                }

        return {
            "updated": True,
            "jira_key": issue_key,
            "case_id": ticket.case_id,
            "changed_fields": changed_fields,
            "rag_ingest": rag_ingest,
        }
    finally:
        db.close()
