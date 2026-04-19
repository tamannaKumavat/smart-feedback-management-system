from enum import Enum


class AnalysisAgentIntent(str, Enum):
    QUESTION = "question"
    REPORT_ISSUE = "report_issue"


class AnalysisAgentSentiment(str, Enum):
    GOOD = "good"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class AnalysisAgentUrgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "hugh"


class AnalysisAgentIssueType(str, Enum):
    BUG = "bug"
    GENERAL_ISSUE = "general_issue"
    UI_UX = "ui_ux"


class AnswerCanBeGeneratedWithRAGResult(str, Enum):
    YES = "yes"
    NO = "no"