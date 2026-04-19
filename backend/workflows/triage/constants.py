from typing import Literal

DECISION_OK: str = "Ok"
DECISION_CLARIFICATION: str = "Clarification"
DECISION_NOT_SOLVABLE: str = "Not solvable"

JUDGE_OK: str = "Ok"
JUDGE_REFINE: str = "Refine"
JUDGE_MAX_ITERATIONS: int = 2

HUMAN_ASSESSMENT_OK: str = "Ok"
HUMAN_ASSESSMENT_ADD_ADDITIONAL_CONTENT: str = "additional_content"
HUMAN_ASSESSMENT_REDO_TICKET: str = "redo_ticket"

SUPPORT_LEVEL_SEVERITY: Literal[str] = Literal["low", "medium", "high"]
SUPPORT_LEVEL: Literal[int] = Literal[1, 2, 3]

INCIDENT_ROUTE_LEVEL_1: str = "level_1_support"
INCIDENT_ROUTE_HIGHER_LEVEL: str = "higher_level_support"
