from typing_extensions import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages

from pydantic import BaseModel, Field

from backend.workflows.smart_feedback.constants import (
    AnalysisAgentIntent,
    AnalysisAgentSentiment,
    AnalysisAgentUrgency,
    AnalysisAgentIssueType,
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


class SmartFeedbackState(TypedDict):
    user_query: str
    chat_history: Annotated[list, add_messages]  # For keeping track of the messages
    human_assessment: str = ""
    ticket_id: str = ""
    analysis_agent_result: AnalysisAgentResult
    rag_workflow_state: dict = {}
    triage_workflow_state: dict = {}
