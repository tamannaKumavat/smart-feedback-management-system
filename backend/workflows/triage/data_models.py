from pydantic import BaseModel, Field
from typing_extensions import TypedDict
from typing import Annotated, Literal
from langgraph.graph.message import add_messages
from workflows.triage.constants import (
    RAGEvaluationDecision,
    TriageJudgeDecision,
)


class RAGDecision(BaseModel):
    """Is the pydantic model which handles the decision of the RAG result.

    decision (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    decision: RAGEvaluationDecision = (
        Field(
            description="The specific literate of the decision",
        )
    )
    reason: str = Field(
        description="Provides the reason for the given decision", default=""
    )



class IncidentAssessment(BaseModel):
    """Is the pydantic model which handles the decision for the .

    severity (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    severity: Literal[1, 2, 3] = Field(
        description="Is the severity level of the user request. By default its the lowest severity",
        default=1,
    )
    reason: str = Field(
        description="Provides the reason for the given decision", default=""
    )
    user_issue: str = Field(description="Identifies the correct user issue.")


class IncidentAssessmentJudge(BaseModel):
    """Is the pydantic model which handles the decision for the .

    severity (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    overall_assessment: TriageJudgeDecision = Field(
        description="Gives the overall assessment of the judge.", default=TriageJudgeDecision.REFINE
    )
    reason: str = Field(
        description="Provides the reason for the given decision of the assessment and what needs to be refined.",
        default="",
    )


class TriageState(TypedDict):
    user_query: str
    final_user_response: str = ""
    rag_results: list = []
    chat_history: Annotated[list, add_messages]  # For keeping track of the messages
    rag_decision: RAGDecision = None
    incident_assessment: IncidentAssessment = None
    incident_assessment_judge: IncidentAssessmentJudge = None
    human_assessment: str = ""
    ticket_content: str = ""
    ticket_id: str = ""