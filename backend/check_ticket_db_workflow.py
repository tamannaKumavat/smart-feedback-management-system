"""Check only the workflow ticket-table handoff.

Dry run (default):
    .venv/bin/python check_ticket_db_workflow.py

Live DB insert:
    .venv/bin/python check_ticket_db_workflow.py --live --issue-id ISSUE --user-id USER

The dry run does not use the UI, websocket, RAG, WatsonX, Jira, or a real DB.
It calls only SmartFeedbackWorkflow.update_ticket() with a fake DB session.
"""

from __future__ import annotations

import argparse
import json
from typing import Any

from workflows.smart_feedback.constants import (
    AnalysisAgentIntent,
    AnalysisAgentIssueType,
    AnalysisAgentSentiment,
    AnalysisAgentUrgency,
    Language,
)
from workflows.smart_feedback.data_models import AnalysisAgentResult
from workflows.smart_feedback import workflow as workflow_module
from workflows.triage.constants import AvailableTeams
from workflows.triage.data_models import IncidentAssessment


TICKET_SUMMARY = """
1. **Title**: Login error after password reset

2. **Description**: User cannot log in after resetting their password.
The issue happens repeatedly and needs investigation by the support team.
"""


class FakeDbSession:
    saved_ticket = None

    def add(self, ticket):
        self.saved_ticket = ticket

    def commit(self):
        if self.saved_ticket is not None:
            self.saved_ticket.case_id = "DB-TEST-1"

    def refresh(self, ticket):
        return None

    def close(self):
        return None


def fake_session_local():
    return FakeDbSession()


def build_workflow_shell():
    workflow = workflow_module.SmartFeedbackWorkflow.__new__(
        workflow_module.SmartFeedbackWorkflow
    )
    workflow.graph_config = {"configurable": {"thread_id": "local-db-ticket-test"}}
    return workflow


def build_state(issue_id: str, user_id: str) -> dict[str, Any]:
    return {
        "issue_id": issue_id,
        "user_id": user_id,
        "ticket_id": "",
        "ticket_summary": TICKET_SUMMARY,
        "ticket_content": TICKET_SUMMARY,
        "analysis_agent_result": AnalysisAgentResult(
            intent=AnalysisAgentIntent.REPORT_ISSUE,
            sentiment=AnalysisAgentSentiment.NEGATIVE,
            urgency=AnalysisAgentUrgency.HIGH,
            issue_type=AnalysisAgentIssueType.BUG,
            language=Language.EN,
        ),
        "incident_assessment": [
            IncidentAssessment(
                severity=3,
                reason="User is blocked after a password reset.",
                user_issue="Login fails after password reset.",
                recommended_action="Investigate the authentication reset flow.",
                support_team=AvailableTeams.SOFTWARE_DEVELOPMENT,
            )
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--issue-id", default="issue-test")
    parser.add_argument("--user-id", default="user-test")
    args = parser.parse_args()

    if not args.live:
        workflow_module.SessionLocal = fake_session_local
        print("Running dry-run DB ticket check. No DB row will be created.")
    else:
        print("Running LIVE DB ticket check. This will insert a ticket row.")

    workflow = build_workflow_shell()
    result = workflow_module.SmartFeedbackWorkflow.update_ticket(
        workflow,
        build_state(args.issue_id, args.user_id),
    )

    print("\n=== update_ticket result ===")
    print(json.dumps(result, indent=2))

    if not args.live:
        assert result["ticket_id"] == "DB-TEST-1"
        print("\nPASS: update_ticket creates the expected ticket in dry-run mode.")


if __name__ == "__main__":
    main()
