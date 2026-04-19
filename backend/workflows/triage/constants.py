from typing import Literal
from enum import Enum

JUDGE_MAX_ITERATIONS: int = 2
SUPPORT_LEVEL: Literal[int] = Literal[1, 2, 3]


class RAGEvaluationDecision(str, Enum):
    OK: str = "Ok"
    CLARIFICATION: str = "Clarification"
    NOT_SOLVABLE: str = "Not solvable"


class TriageJudgeDecision(str, Enum):
    OK: str = "Ok"
    REFINE: str = "Refine"


class HumanAssessment(str, Enum):
    OK: str = "Ok"
    ADD_ADDITIONAL_CONTENT: str = "additional_content"
    REDO_TICKET: str = "redo_ticket"
