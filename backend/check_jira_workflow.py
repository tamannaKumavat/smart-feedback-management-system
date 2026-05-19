"""Check only the smart-feedback Jira handoff.

Dry run (default):
    .venv/bin/python check_jira_workflow.py

Real Jira create:
    .venv/bin/python check_jira_workflow.py --live

The dry run does not use the UI, DB, RAG, WatsonX, or websockets. It calls only
SmartFeedbackWorkflow.add_ticket_to_jira() with a realistic workflow state.
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


class FakeJiraClient:
    created_record: dict[str, Any] | None = None

    def create_issue(self, record: dict[str, Any]) -> dict[str, str]:
        self.__class__.created_record = record
        print("\n=== Jira record that would be sent ===")
        print(json.dumps(record, indent=2))
        return {"id": "10001", "key": "TEST-1"}


def build_workflow_shell():
    workflow = workflow_module.SmartFeedbackWorkflow.__new__(
        workflow_module.SmartFeedbackWorkflow
    )
    workflow.graph_config = {"configurable": {"thread_id": "local-jira-test"}}
    return workflow


def build_state() -> dict[str, Any]:
    return {
        "ticket_id": "",
        "ticket_summary": TICKET_SUMMARY,
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
    parser.add_argument(
        "--live",
        action="store_true",
        help="Create a real Jira issue using the JIRA_* environment variables.",
    )
    args = parser.parse_args()

    if not args.live:
        workflow_module.JiraClient = FakeJiraClient
        workflow_module.jira_browse_url = (
            lambda key: f"https://example.atlassian.net/browse/{key}"
        )
        print("Running dry-run Jira check. No real Jira ticket will be created.")
    else:
        print("Running LIVE Jira check. This will create a real Jira ticket.")

    workflow = build_workflow_shell()
    result = workflow_module.SmartFeedbackWorkflow.add_ticket_to_jira(
        workflow,
        build_state(),
    )

    print("\n=== Workflow result ===")
    print(json.dumps(result, indent=2))

    if not args.live:
        record = FakeJiraClient.created_record
        assert record is not None, "Fake Jira client was not called."
        assert record["summary"] == "Login error after password reset"
        assert "User cannot log in" in record["description"]
        assert record["priority"] == "High"
        assert record["team"] == "software_development"
        assert result["ticket_id"] == "TEST-1"
        print("\nPASS: Jira handoff works in dry-run mode.")


if __name__ == "__main__":
    main()
