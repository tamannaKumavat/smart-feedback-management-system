"""Check the DB ticket creation and Jira handoff together.

Dry run (default):
    .venv/bin/python check_ticket_db_and_jira_workflow.py

Live DB insert only:
    .venv/bin/python check_ticket_db_and_jira_workflow.py --live-db --issue-id ISSUE --user-id USER

Live Jira create only:
    .venv/bin/python check_ticket_db_and_jira_workflow.py --live-jira

Live DB and Jira:
    .venv/bin/python check_ticket_db_and_jira_workflow.py --live-db --live-jira --issue-id ISSUE --user-id USER

Five varied sample tickets:
    .venv/bin/python check_ticket_db_and_jira_workflow.py --sample-set five
    .venv/bin/python check_ticket_db_and_jira_workflow.py --sample-set five --live-db --live-jira --issue-id ISSUE --user-id USER
    .venv/bin/python check_ticket_db_and_jira_workflow.py --sample-set five --live-db --live-jira --create-test-parents

Dry-run mode does not use the UI, websocket, RAG, WatsonX, real DB, or real
Jira. It calls the two workflow nodes in the same order as the graph:
update_ticket() -> add_ticket_to_jira().
"""

from __future__ import annotations

import argparse
import json
from typing import Any

from db import SessionLocal
from models.chat import ISSUE_STATUS_ACTIVE, Issue
from models.user import User
from workflows.smart_feedback import workflow as workflow_module
from workflows.smart_feedback.constants import (
    AnalysisAgentIntent,
    AnalysisAgentIssueType,
    AnalysisAgentSentiment,
    AnalysisAgentUrgency,
    Language,
)
from workflows.smart_feedback.data_models import AnalysisAgentResult
from workflows.triage.constants import AvailableTeams
from workflows.triage.data_models import IncidentAssessment


TICKET_SUMMARY = """
1. **Title**: Login error after password reset

2. **Description**: User cannot log in after resetting their password.
The issue happens repeatedly and needs investigation by the support team.
"""

TEST_USER_ID = "u-cc28ca8b"
TEST_ISSUE_ID = "0ffc8f40-f872-479f-9c6e-63f269f16979"


SAMPLE_TICKETS: list[dict[str, Any]] = [
    {
        "name": "login-blocker",
        "summary": TICKET_SUMMARY,
        "intent": AnalysisAgentIntent.REPORT_ISSUE,
        "sentiment": AnalysisAgentSentiment.NEGATIVE,
        "urgency": AnalysisAgentUrgency.HIGH,
        "issue_type": AnalysisAgentIssueType.BUG,
        "language": Language.EN,
        "severity": 3,
        "reason": "User is blocked after a password reset.",
        "user_issue": "Login fails after password reset.",
        "recommended_action": "Investigate the authentication reset flow.",
        "team": AvailableTeams.SOFTWARE_DEVELOPMENT,
    },
    {
        "name": "policy-citation-mismatch",
        "summary": """
1. **Title**: Incorrect citation for overtime policy

2. **Description**: User asked about part-time overtime rules, but the assistant cited a full-time employee policy.
The response should be checked against the correct policy source.
""",
        "intent": AnalysisAgentIntent.POLICY_LOOKUP,
        "sentiment": AnalysisAgentSentiment.NEGATIVE,
        "urgency": AnalysisAgentUrgency.MEDIUM,
        "issue_type": AnalysisAgentIssueType.GENERAL_ISSUE,
        "language": Language.IT_CH,
        "severity": 2,
        "reason": "The answer used a mismatched supporting document.",
        "user_issue": "Policy citation does not match the user's request.",
        "recommended_action": "Review retrieval results and update the cited source.",
        "team": AvailableTeams.SUPPORT,
    },
    {
        "name": "ui-feedback",
        "summary": """
1. **Title**: Feedback panel is hard to scan

2. **Description**: User says the feedback history panel is visually dense and difficult to scan on smaller screens.
This is usability feedback rather than a functional blocker.
""",
        "intent": AnalysisAgentIntent.FEEDBACK_GENERAL,
        "sentiment": AnalysisAgentSentiment.NEUTRAL,
        "urgency": AnalysisAgentUrgency.LOW,
        "issue_type": AnalysisAgentIssueType.UI_UX,
        "language": Language.DE_CH,
        "severity": 1,
        "reason": "The issue affects usability but does not block the workflow.",
        "user_issue": "Feedback panel layout is difficult to scan.",
        "recommended_action": "Review spacing, grouping, and mobile layout for the feedback panel.",
        "team": AvailableTeams.SOFTWARE_DEVELOPMENT,
    },
    {
        "name": "security-concern",
        "summary": """
1. **Title**: User concerned about logged financial queries

2. **Description**: User asked whether sensitive financial queries are logged and shared with third parties.
The assistant answered with unrelated travel guidance.
""",
        "intent": AnalysisAgentIntent.REPORT_ISSUE,
        "sentiment": AnalysisAgentSentiment.NEGATIVE,
        "urgency": AnalysisAgentUrgency.HIGH,
        "issue_type": AnalysisAgentIssueType.GENERAL_ISSUE,
        "language": Language.FR_CH,
        "severity": 3,
        "reason": "The answer missed a privacy/security concern.",
        "user_issue": "Privacy question was not addressed.",
        "recommended_action": "Escalate for privacy review and provide approved data-handling guidance.",
        "team": AvailableTeams.SECURITY,
    },
    {
        "name": "general-question",
        "summary": """
1. **Title**: User asks about onboarding guidance

2. **Description**: User asked where to find onboarding material for a new internal tool.
The assistant answered correctly, but the support team should verify the guidance stays current.
""",
        "intent": AnalysisAgentIntent.QUESTION,
        "sentiment": AnalysisAgentSentiment.GOOD,
        "urgency": AnalysisAgentUrgency.LOW,
        "issue_type": AnalysisAgentIssueType.GENERAL_ISSUE,
        "language": Language.EN,
        "severity": 1,
        "reason": "Low-risk informational request.",
        "user_issue": "User needs onboarding material.",
        "recommended_action": "Confirm onboarding links and keep the knowledge article current.",
        "team": AvailableTeams.SUPPORT,
    },
]


class FakeDbSession:
    next_id = 1
    saved_ticket = None

    def add(self, ticket):
        self.saved_ticket = ticket

    def commit(self):
        if self.saved_ticket is not None:
            self.saved_ticket.case_id = f"DB-TEST-{self.__class__.next_id}"
            self.__class__.next_id += 1

    def refresh(self, ticket):
        return None

    def close(self):
        return None


class FakeJiraClient:
    created_record: dict[str, Any] | None = None
    created_records: list[dict[str, Any]] = []
    next_id = 1

    def create_issue(self, record: dict[str, Any]) -> dict[str, str]:
        self.__class__.created_record = record
        self.__class__.created_records.append(record)
        print("\n=== Jira record that would be sent ===")
        print(json.dumps(record, indent=2))
        ticket_number = self.__class__.next_id
        self.__class__.next_id += 1
        return {"id": str(10000 + ticket_number), "key": f"JIRA-TEST-{ticket_number}"}


def fake_session_local():
    return FakeDbSession()


def ensure_test_parents(user_id: str, issue_id: str) -> None:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if user is None:
            db.add(
                User(
                    id=user_id,
                    full_name="Jira Check User",
                    email=f"{user_id}@example.test",
                    password_hash="test-only",
                    role="client",
                )
            )

        issue = db.get(Issue, issue_id)
        if issue is None:
            db.add(
                Issue(
                    id=issue_id,
                    user_id=user_id,
                    summary="Jira workflow check parent issue",
                    status=ISSUE_STATUS_ACTIVE,
                )
            )

        db.commit()
        print(f"DB: ensured test user={user_id} and issue={issue_id}.")
    finally:
        db.close()


def validate_live_db_parents(user_id: str, issue_id: str) -> None:
    db = SessionLocal()
    try:
        missing = []
        if db.get(User, user_id) is None:
            missing.append(f"user_id={user_id!r}")
        if db.get(Issue, issue_id) is None:
            missing.append(f"issue_id={issue_id!r}")
        if missing:
            raise SystemExit(
                "Live DB insert needs existing parent rows for "
                + ", ".join(missing)
                + ". Pass real --user-id/--issue-id values, or rerun with "
                "--create-test-parents to create reusable test parents."
            )
    finally:
        db.close()


def build_workflow_shell():
    workflow = workflow_module.SmartFeedbackWorkflow.__new__(
        workflow_module.SmartFeedbackWorkflow
    )
    workflow.graph_config = {"configurable": {"thread_id": "combined-ticket-test"}}
    workflow.db = None
    workflow.issue = None
    workflow.user_id = None
    return workflow


def build_state(
    issue_id: str,
    user_id: str,
    sample: dict[str, Any] | None = None,
) -> dict[str, Any]:
    sample = sample or SAMPLE_TICKETS[0]
    return {
        "issue_id": issue_id,
        "user_id": user_id,
        "ticket_id": "",
        "ticket_summary": sample["summary"],
        "ticket_content": sample["summary"],
        "analysis_agent_result": AnalysisAgentResult(
            intent=sample["intent"],
            sentiment=sample["sentiment"],
            urgency=sample["urgency"],
            issue_type=sample["issue_type"],
            language=sample["language"],
        ),
        "incident_assessment": [
            IncidentAssessment(
                severity=sample["severity"],
                reason=sample["reason"],
                user_issue=sample["user_issue"],
                recommended_action=sample["recommended_action"],
                support_team=sample["team"],
            )
        ],
    }


def run_ticket(
    workflow,
    state: dict[str, Any],
    sample_name: str,
    live_db: bool,
    live_jira: bool,
) -> dict[str, Any]:
    print(f"\n=== sample: {sample_name} ===")
    db_result = workflow_module.SmartFeedbackWorkflow.update_ticket(workflow, state)
    state.update(db_result)

    print("\n=== update_ticket result ===")
    print(json.dumps(db_result, indent=2))

    jira_result = workflow_module.SmartFeedbackWorkflow.add_ticket_to_jira(
        workflow,
        state,
    )

    print("\n=== add_ticket_to_jira result ===")
    print(json.dumps(jira_result, indent=2))

    if not live_db:
        assert db_result["ticket_id"].startswith("DB-TEST-")

    if not live_jira:
        record = FakeJiraClient.created_record
        assert record is not None, "Fake Jira client was not called."
        assert record["case_id"] == db_result["ticket_id"]
        assert jira_result["ticket_id"].startswith("JIRA-TEST-")

    return {
        "sample": sample_name,
        "db_ticket_id": db_result.get("ticket_id"),
        "jira_ticket_id": jira_result.get("ticket_id"),
        "jira_url": (jira_result.get("jira_ticket") or {}).get("url"),
        "jira_error": jira_result.get("final_user_response")
        if "jira_ticket" not in jira_result
        else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-db", action="store_true")
    parser.add_argument("--live-jira", action="store_true")
    parser.add_argument("--issue-id", default="issue-test")
    parser.add_argument("--user-id", default="user-test")
    parser.add_argument(
        "--create-test-parents",
        action="store_true",
        help=(
            "When --live-db is used, create/reuse a test user and issue so "
            "ticket inserts satisfy foreign keys."
        ),
    )
    parser.add_argument(
        "--sample-set",
        choices=["single", "five"],
        default="single",
        help="Use one default sample ticket or five varied sample tickets.",
    )
    args = parser.parse_args()

    if args.create_test_parents:
        args.live_db = True
        args.user_id = TEST_USER_ID
        args.issue_id = TEST_ISSUE_ID

    if not args.live_db:
        FakeDbSession.next_id = 1
        workflow_module.SessionLocal = fake_session_local
        print("DB: dry run. No DB row will be created.")
    else:
        if args.create_test_parents:
            ensure_test_parents(args.user_id, args.issue_id)
        else:
            validate_live_db_parents(args.user_id, args.issue_id)
        print("DB: LIVE. This will insert a ticket row.")

    if not args.live_jira:
        FakeJiraClient.created_record = None
        FakeJiraClient.created_records = []
        FakeJiraClient.next_id = 1
        workflow_module.JiraClient = FakeJiraClient
        workflow_module.jira_browse_url = (
            lambda key: f"https://example.atlassian.net/browse/{key}"
        )
        print("Jira: dry run. No Jira issue will be created.")
    else:
        print("Jira: LIVE. This will create a real Jira issue.")

    workflow = build_workflow_shell()
    samples = SAMPLE_TICKETS[:1] if args.sample_set == "single" else SAMPLE_TICKETS
    results = [
        run_ticket(
            workflow=workflow,
            state=build_state(args.issue_id, args.user_id, sample),
            sample_name=sample["name"],
            live_db=args.live_db,
            live_jira=args.live_jira,
        )
        for sample in samples
    ]

    print("\n=== summary ===")
    print(json.dumps(results, indent=2))

    if not args.live_db and not args.live_jira:
        print(
            f"\nPASS: {len(samples)} DB ticket creation and Jira handoff check(s) "
            "worked in dry-run mode."
        )


if __name__ == "__main__":
    main()
