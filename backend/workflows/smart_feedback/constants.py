from enum import Enum


class AnalysisAgentIntent(str, Enum):
    QUESTION = "question"
    REPORT_ISSUE = "report_issue"
    FEEDBACK_GENERAL = "feedback_general"
    POLICY_LOOKUP = "policy_lookup"


class AnalysisAgentSentiment(str, Enum):
    GOOD = "good"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class AnalysisAgentUrgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AnalysisAgentIssueType(str, Enum):
    BUG = "bug"
    GENERAL_ISSUE = "general_issue"
    UI_UX = "ui_ux"


class AnswerCanBeGeneratedWithRAGResult(str, Enum):
    YES = "yes"
    NO = "no"


class Language(str, Enum):
    EN = "en"
    DE_CH = "de-CH"
    FR_CH = "fr-CH"
    IT_CH = "it-CH"
