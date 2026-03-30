from pydantic import BaseModel, Field
from typing_extensions import TypedDict
from typing import Literal, Annotated
from langgraph.graph.message import add_messages
from backend.workflows.triage.constants import (
    DECISION_CLARIFICATION,
    DECISION_NOT_SOLVABLE,
    DECISION_OK,
    SUPPORT_LEVEL,
    SUPPORT_LEVEL_SEVERITY,
    JUDGE_OK,
    JUDGE_REFINE,
)


class RAGDecision(BaseModel):
    """Is the pydantic model which handles the decision of the RAG result.

    decision (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    decision: Literal[DECISION_OK, DECISION_CLARIFICATION, DECISION_NOT_SOLVABLE] = (
        Field(
            description="The specific literate of the decision",
        )
    )
    reason: str = Field(
        description="Provides the reason for the given decision", default=""
    )



class IncidentAssessment(BaseModel):
    """Is the pydantic model which handles the decision for the .

    support_level (Literal): oes not exactly match the request, not solvable -> Nothing was found
    severity (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    support_level: SUPPORT_LEVEL = Field(
        description="The specific literate of the support level.",
    )
    severity: SUPPORT_LEVEL_SEVERITY = Field(
        description="Is the severity level of the user request. By default its the lowest severity",
        default=SUPPORT_LEVEL_SEVERITY.__args__[0],
    )
    reason: str = Field(
        description="Provides the reason for the given decision", default=""
    )


class IncidentAssessmentJudge(BaseModel):
    """Is the pydantic model which handles the decision for the .

    support_level (Literal): oes not exactly match the request, not solvable -> Nothing was found
    severity (Literal): Can either be ok -> RAG response was fine, clarification -> The retrieved content does not exactly match the request, not solvable -> Nothing was found
    reason (str): Is the rational behind the decision of the LLM.
    """

    overall_assessment: Literal[JUDGE_OK, JUDGE_REFINE] = Field(
        description="Gives the overall assessment of the judge.", default=JUDGE_REFINE
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
    ticket_id: str = ""