from typing_extensions import TypedDict
from typing import Annotated, List
from operator import add
from langgraph.graph.message import add_messages

from pydantic import BaseModel, Field

from workflows.smart_feedback.constants import (
    AnalysisAgentIntent,
    AnalysisAgentSentiment,
    AnalysisAgentUrgency,
    AnalysisAgentIssueType,
    Language,
)
from workflows.triage.data_models import IncidentAssessment, IncidentAssessmentJudge


class EngagementDecision(BaseModel):
    """Structured output for the engagement agent's first-phase decision."""

    needs_clarification: bool = Field(
        description=(
            "True if the user query is vague or missing key details and a "
            "clarifying question must be asked before proceeding."
        ),
        default=False,
    )
    response: str = Field(
        description=(
            "A warm acknowledgment when needs_clarification is False, "
            "or a single specific clarifying question when it is True."
        ),
    )


class AnalysisAgentResult(BaseModel):
    """Is the pydantic model which handles the result of the analysis agent"""

    intent: AnalysisAgentIntent = Field(
        description="Provides the classification of the intent",
        default=AnalysisAgentIntent.REPORT_ISSUE,
    )
    sentiment: AnalysisAgentSentiment = Field(
        description="Describes the user sentiment of the request",
        default=AnalysisAgentSentiment.NEUTRAL,
    )
    urgency: AnalysisAgentUrgency = Field(
        description="Describes the urgency of the request.",
        default=AnalysisAgentUrgency.LOW,
    )

    issue_type: AnalysisAgentIssueType = Field(
        description="Describes the specific issue type ",
        default=AnalysisAgentIssueType.GENERAL_ISSUE,
    )
    language: Language = Field(
        description="The language in which the user interacts.", default=Language.EN
    )


class SmartFeedbackState(TypedDict):
    user_query: str
    prior_history: list  # [{sender, content}] from DB — conversation so far
    chat_history: Annotated[list, add_messages]
    is_first_message: bool  # True only on the user's very first message in a session
    needs_clarification: bool  # set by engagement Phase 1; routes to END when True
    human_assessment: str
    ticket_id: str
    analysis_agent_result: AnalysisAgentResult  # None until analysis_agent runs
    rag_results: list  # list of dicts from RAGAgent.search()
    rag_user_assessment: str
    rag_workflow_state: dict
    triage_workflow: dict
    engagement_response: str       # RAG answer composed by Phase 2 engagement_with_user
    final_user_response: str       # closing message sent at end_node (triage or RAG confirmed)
    ready_to_create_ticket: bool   # True after Phase 2
    ticket_content: str            # structured ticket body built by formulate_ticket_content
    incident_assessment: Annotated[List[IncidentAssessment], add]
    incident_assessment_judge: Annotated[List[IncidentAssessmentJudge], add]
