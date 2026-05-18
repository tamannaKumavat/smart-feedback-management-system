import re
import logging
from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from langchain_core.messages import AIMessage, HumanMessage

from workflows.smart_feedback.data_models import (
    SmartFeedbackState,
    AnalysisAgentResult,
    EngagementDecision,
    InterruptData
)
from workflows.smart_feedback.prompt_templates import (
    chat_template_analysis_agent,
    chat_template_engagement_entry,
    chat_template_engagement_followup,
    chat_template_engagement_rag,
)
from workflows.smart_feedback.rag_agent import RAGAgent, RELEVANCE_THRESHOLD

from workflows.triage.data_models import (
    IncidentAssessment,
    IncidentAssessmentJudge,
)
from workflows.triage.prompt_templates import (
    chat_template_rag_ok_response,
    chat_template_triage_judge,
    chat_template_triage_support_level,
    chat_template_ticket_creation,
)
from workflows.triage.constants import (
    TriageJudgeDecision,
    HumanAssessment,
)
from db import SessionLocal
from models.chat import TICKET_STATUS_NEW, Ticket
from services.jira_sync import (
    JiraApiError,
    JiraClient,
    JiraConfigError,
    jira_browse_url,
)

logger = logging.getLogger(__name__)


def _debug(message: str, *args) -> None:
    text = message % args if args else message
    print(text, flush=True)


def _debug_exception(message: str, *args) -> None:
    _debug(message, *args)
    logger.exception(message, *args)


def _format_history(prior_history: list[dict]) -> str:
    if not prior_history:
        return "(no prior conversation)"
    lines = []
    for msg in prior_history:
        role = "User" if msg.get("sender") == "user" else "Support Agent"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


def _clean_ticket_text(text: str) -> str:
    text = re.sub(r"^\s*(?:[-*]|\d+\.)\s*", "", text.strip())
    text = re.sub(r"^#{1,6}\s*", "", text)
    return text.replace("**", "").strip()


def _ticket_label_and_value(line: str) -> tuple[str, str] | None:
    cleaned = _clean_ticket_text(line)
    match = re.match(r"^\*{0,2}\s*([A-Za-z][A-Za-z /_-]{0,60})\s*\*{0,2}\s*[:：]\s*(.*)$", cleaned)
    if not match:
        return None
    return match.group(1).strip().lower(), match.group(2).strip()


def _is_ticket_heading(line: str) -> bool:
    cleaned = _clean_ticket_text(line).lower()
    return cleaned in {"support ticket", "ticket", "jira ticket"}


def _split_ticket_content(ticket_content: str) -> tuple[str, str]:
    lines = [line.strip() for line in ticket_content.splitlines() if line.strip()]
    if not lines:
        return "Feedback ticket", ""

    title = ""
    description_lines = []
    in_description = False
    seen_description = False

    for line in lines:
        if _is_ticket_heading(line):
            continue

        label_value = _ticket_label_and_value(line)
        if label_value:
            label, value = label_value

            if label in {"title", "summary"}:
                title = value
                in_description = False
                continue

            if label == "description":
                in_description = True
                seen_description = True
                if value:
                    description_lines.append(value)
                continue

            # Once the description section has started, keep useful subsection
            # labels but drop the raw markdown/bold scaffolding.
            if in_description or seen_description:
                formatted = f"{label.replace('_', ' ').title()}: {value}".strip()
                description_lines.append(formatted)
                continue

            continue

        if in_description:
            description_lines.append(_clean_ticket_text(line))

    if not title:
        title = next(
            (
                _clean_ticket_text(line)
                for line in lines
                if not _is_ticket_heading(line)
            ),
            "Feedback ticket",
        )

    description = "\n".join(description_lines).strip()
    if not description:
        description = "\n".join(
            _clean_ticket_text(line)
            for line in lines
            if not _is_ticket_heading(line)
        ).strip()
    return title[:255] or "Feedback ticket", description


def _ticket_record_from_state(
    state: SmartFeedbackState,
    graph_config: dict | None = None,
) -> dict[str, Any]:
    ticket_summary = state.get("ticket_summary") or state.get("ticket_content") or ""
    summary, description = _split_ticket_content(ticket_summary)

    incident_assessments = state.get("incident_assessment") or []
    incident_assessment = incident_assessments[-1] if incident_assessments else None
    analysis_result = state.get("analysis_agent_result")
    thread_id = (
        graph_config.get("configurable", {}).get("thread_id")
        if graph_config
        else None
    )

    severity = _enum_value(getattr(incident_assessment, "severity", None))
    urgency = _enum_value(getattr(analysis_result, "urgency", None))
    priority_by_severity = {1: "Low", 2: "Medium", 3: "High"}

    labels = ["source_smart_feedback"]
    if analysis_result:
        labels.extend(
            [
                f"intent_{_enum_value(analysis_result.intent)}",
                f"sentiment_{_enum_value(analysis_result.sentiment)}",
                f"urgency_{urgency}",
                f"issue_{_enum_value(analysis_result.issue_type)}",
                f"language_{_enum_value(analysis_result.language)}",
            ]
        )
    if severity:
        labels.append(f"severity_{severity}")

    return {
        "case_id": state.get("ticket_id")
        or (f"CHAT-{thread_id}" if thread_id else ""),
        "summary": summary,
        "description": description,
        "issue_type": (
            _enum_value(analysis_result.issue_type)
            if analysis_result
            else "feedback"
        ),
        "priority": priority_by_severity.get(severity, "Medium"),
        "severity": severity,
        "urgency": urgency,
        "team": _enum_value(getattr(incident_assessment, "support_team", "support")),
        "labels": labels,
        "recommended_action": getattr(incident_assessment, "recommended_action", ""),
    }


def build_workflow(
    checkpointer: Any = None,
    graph_config: dict = {},
    chat_model_input: Any = None,
    db=None,
    issue=None,
    user_id: str | None = None,
) -> "SmartFeedbackWorkflow":
    """Construct a SmartFeedbackWorkflow with the correct chat model for the current config."""
    from config import MOCK_MODE

    _debug("[workflow] build_workflow mock_mode=%s graph_config=%s", MOCK_MODE, graph_config)
    if chat_model_input:
        chat_model = chat_model_input
    elif MOCK_MODE:
        chat_model = _build_mock_chat_model()
    else:
        chat_model = _build_live_chat_model()
    return SmartFeedbackWorkflow(
        chat_model,
        checkpointer=checkpointer,
        graph_config=graph_config,
        db=db,
        issue=issue,
        user_id=user_id,
    )


def _build_live_chat_model():
    from langchain_ibm import ChatWatsonx
    from config import (
        WATSONX_API_KEY,
        WATSONX_MODEL_ID,
        WATSONX_PROJECT_ID,
        WATSONX_URL,
    )

    if not WATSONX_API_KEY:
        raise RuntimeError("WATSONX_API_KEY is not set. Add it to your .env file.")
    if not WATSONX_PROJECT_ID:
        raise RuntimeError("WATSONX_PROJECT_ID is not set. Add it to your .env file.")

    return ChatWatsonx(
        model_id=WATSONX_MODEL_ID,
        url=WATSONX_URL,
        apikey=WATSONX_API_KEY,
        project_id=WATSONX_PROJECT_ID,
        params={"max_new_tokens": 512, "temperature": 0.3},
    )


def _build_mock_chat_model():
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.messages import AIMessage
    from langchain_core.outputs import ChatGeneration, ChatResult
    from langchain_core.runnables import RunnableLambda

    class _MockChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            return ChatResult(
                generations=[
                    ChatGeneration(
                        message=AIMessage(
                            content=(
                                "[MOCK] Thank you for reaching out. "
                                "I have received your message and am looking into it."
                            )
                        )
                    )
                ]
            )

        def with_structured_output(self, schema, **kwargs):
            def build_default(_input):
                init_kwargs = {}
                for field_name, field_info in schema.model_fields.items():
                    ann = field_info.annotation
                    if ann is bool and field_info.default is True:
                        # Flip True-defaulted bools to False so mock proceeds through the flow
                        init_kwargs[field_name] = False
                    elif field_info.is_required():
                        if ann is str:
                            init_kwargs[field_name] = "[MOCK]"
                        elif ann is int:
                            init_kwargs[field_name] = 1
                        elif hasattr(ann, "__members__"):
                            init_kwargs[field_name] = list(ann)[0]
                        elif hasattr(ann, "__args__"):
                            init_kwargs[field_name] = ann.__args__[0]
                        else:
                            init_kwargs[field_name] = None
                try:
                    return schema(**init_kwargs)
                except Exception:
                    return schema()

            return RunnableLambda(build_default)

        @property
        def _llm_type(self) -> str:
            return "mock"

    return _MockChatModel()


class SmartFeedbackWorkflow:
    """Coordinates the full smart-feedback pipeline.

    Graph flow:
        START
        engagement_with_user  [Phase 1]
                needs_clarification=True  ──► END  (clarifying question returned)
                needs_clarification=False ──► create_ticket
                then fan-out: analysis_agent + rag_search_workflow (parallel)
                fan-in ──► engagement_with_user  [Phase 2]
                RAG sufficient ──► END
                RAG insufficient ──► triage_workflow ──► END
    """

    def __init__(
        self,
        chat_model: Any,
        checkpointer: Any = None,
        graph_config: dict = {},
        db=None,
        issue=None,
        user_id: str | None = None,
    ):
        self.chat_model = chat_model
        self._rag_agent = RAGAgent()
        self._workflow: StateGraph = None
        self.checkpointer = checkpointer
        self.graph_config = graph_config
        self.db = db
        self.issue = issue
        self.user_id = user_id
        self._judge_current_iteration = 0
        self.judge_max_iterations = 1
        self._generate_workflow()

    @property
    def workflow(self):
        return self._workflow

    def _generate_workflow(self):
        workflow = StateGraph(SmartFeedbackState)

        # Add nodes
        workflow.add_node("engagement_with_user", self.engagement_with_user)
        workflow.add_node("create_ticket", self.create_ticket)
        workflow.add_node("analysis_agent", self.analysis_agent)
        workflow.add_node("rag_search_workflow", self.rag_search_workflow)
        workflow.add_node("rag_result_user_assessment", self.rag_result_user_assessment)
        workflow.add_node("add_ticket_to_jira", self.add_ticket_to_jira)
        workflow.add_node("generate_chat_summary", self.generate_chat_summary)

        # Add edges
        workflow.add_edge(START, "engagement_with_user")

        # Phase 1: Route engagement
        workflow.add_conditional_edges(
            "engagement_with_user",
            self._route_engagement,
            {
                "clarify": "engagement_with_user",
                "proceed": "create_ticket",
                "rag_user_assessment": "rag_result_user_assessment",
            },
        )

        # Phase 2: Fan-out to analysis and RAG
        workflow.add_edge("create_ticket", "analysis_agent")
        workflow.add_edge("create_ticket", "rag_search_workflow")

        # Fan-in to engagement_with_user for Phase 2
        workflow.add_edge("analysis_agent", "analysis_rag_results")
        workflow.add_edge("rag_search_workflow", "analysis_rag_results")

        # Route RAG results to either respond or triage
        workflow.add_conditional_edges(
            "analysis_rag_results",
            self._route_rag_results,  # New method to check RAG sufficiency
            {
                "respond": "engagement_with_user",  # RAG sufficient — answer returned to user
                "triage": "triage_request",  # RAG insufficient — escalate to triage
            },
        )

        workflow.add_conditional_edges(
            "rag_result_user_assessment",
            self._route_rag_user_assessment,
            {
                "yes": "generate_chat_summary",  # RAG answer sufficient -> summarise then end
                "no": "engagement_with_user",    # RAG result insufficient -> clarify
            },
        )
        workflow.add_node("analysis_rag_results", self.analysis_rag_results)

        workflow.add_node("triage_request", self.triage_request)
        workflow.add_node("judge_triage_request", self.judge_triage_request)
        workflow.add_node("formulate_ticket_content", self.formulate_ticket_content)
        workflow.add_node("human_ticket_assessment", self.human_ticket_assessment)
        workflow.add_node("update_ticket", self.update_ticket)
        workflow.add_node(
            "add_additional_information_to_ticket",
            self.add_additional_information_to_ticket,
        )
        workflow.add_node(
            "generate_ticket_created_response", self.generate_ticket_created_response
        )
        workflow.add_node("end_node", self.end_node)

        # Adding all the edges
        workflow.add_edge("triage_request", "judge_triage_request")
        workflow.add_conditional_edges(
            "judge_triage_request",
            self.route_judge,
            {
                TriageJudgeDecision.OK: "formulate_ticket_content",
                TriageJudgeDecision.REFINE: "triage_request",
            },
        )
        workflow.add_edge("formulate_ticket_content", "human_ticket_assessment")
        workflow.add_conditional_edges(
            "human_ticket_assessment",
            self.route_human_assessment,
            {
                HumanAssessment.OK: "update_ticket",
                HumanAssessment.ADD_ADDITIONAL_CONTENT: "add_additional_information_to_ticket",
                HumanAssessment.REDO_TICKET: "triage_request",
            },
        )
        workflow.add_edge("add_additional_information_to_ticket", "human_ticket_assessment")
        workflow.add_edge("update_ticket", "generate_ticket_created_response")
        workflow.add_edge("generate_ticket_created_response", "add_ticket_to_jira")
        workflow.add_edge("add_ticket_to_jira", "generate_chat_summary")
        workflow.add_edge("generate_chat_summary", "end_node")
        workflow.add_edge("end_node", END)

        self._workflow = workflow.compile(checkpointer=self.checkpointer)

    def analysis_rag_results(self, state: SmartFeedbackState):
        _debug(
            "[workflow] node=analysis_rag_results analysis=%s rag_count=%s",
            bool(state.get("analysis_agent_result")),
            len(state.get("rag_results", [])),
        )
        return state

    def _route_engagement(self, state: SmartFeedbackState) -> str:
        # Phase 1: Check if clarification is needed
        if state.get("analysis_agent_result") is None:
            route = "clarify" if state.get("needs_clarification", False) else "proceed"
            _debug(
                "[workflow] route=engagement phase=1 needs_clarification=%s -> %s",
                state.get("needs_clarification", False),
                route,
            )
            return route
        # If we reach here, it's Phase 2 (RAG results are available)
        if state.get("rag_results", []) and state.get("engagement_response", ""):
            _debug("[workflow] route=engagement phase=2 -> rag_user_assessment")
            return "rag_user_assessment"

        _debug("[workflow] route=engagement fallback -> proceed")
        return "proceed"  # Proceed to create_ticket (fan-out)

    def _route_rag_results(self, state: SmartFeedbackState) -> str:
        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0)
            >= RELEVANCE_THRESHOLD
        )
        route = "respond" if rag_sufficient else "triage"
        _debug(
            "[workflow] route=rag_results rag_count=%s max_score=%s threshold=%s -> %s",
            len(results),
            max((r.get("score", 0.0) for r in results), default=0.0),
            RELEVANCE_THRESHOLD,
            route,
        )
        return route

    def _route_engagement_phase2(self, state: SmartFeedbackState) -> str:
        # Phase 2: Check if RAG was sufficient (already handled in _route_rag_results)
        # This is a fallback for engagement_with_user in Phase 2
        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0)
            >= RELEVANCE_THRESHOLD
        )
        route = "respond" if rag_sufficient else "triage"
        _debug("[workflow] route=engagement_phase2 -> %s", route)
        return route

    def rag_result_user_assessment(self, state: SmartFeedbackState):
        _debug("[workflow] node=rag_result_user_assessment start")
        rag_answer = state.get("engagement_response", "")
        interrupt_data: InterruptData = {
            "content": (
                f"{rag_answer}\n\nDoes this answer your question?"
                if rag_answer
                else "Please state if this answers your question."
            ),
            "options": ["yes", "no"]
        }
        response = interrupt(
            interrupt_data
        )
        updated_state = {}
        if response.lower() not in ["yes", "no"]:
            response = "no"
        if response.lower() == "no":
            updated_state["rag_results"] = []
            updated_state["analysis_agent_result"] = None
        updated_state["rag_user_assessment"] = response.lower()
        _debug(
            "[workflow] node=rag_result_user_assessment response=%s",
            response.lower(),
        )
        return updated_state

    def _route_rag_user_assessment(self, state: SmartFeedbackState):
        route = "yes" if state.get("rag_user_assessment") == "yes" else "no"
        _debug(
            "[workflow] route=rag_user_assessment value=%s -> %s",
            state.get("rag_user_assessment"),
            route,
        )
        return route

    def engagement_with_user(self, state: SmartFeedbackState) -> dict:
        _debug(
            "[workflow] node=engagement_with_user start phase=%s first_message=%s",
            "2" if state.get("analysis_agent_result") is not None else "1",
            state.get("is_first_message", True),
        )
        if state.get("analysis_agent_result") is not None:
            # Phase 2: compose answer from RAG context
            rag_results = state.get("rag_results", [])
            rag_context = "\n\n".join(
                f"[{r.get('source_type', 'policy')}] {r.get('answer_text', '')}"
                for r in rag_results
            )
            conversation_history = _format_history(state.get("prior_history", []))
            chain = chat_template_engagement_rag | self.chat_model
            response: AIMessage = chain.invoke(
                {
                    "user_query": state["user_query"],
                    "rag_context": rag_context,
                    "conversation_history": conversation_history,
                }
            )
            _debug(
                "[workflow] node=engagement_with_user phase=2 response_length=%s",
                len(response.content or ""),
            )
            return {
                "engagement_response": response.content,
                "chat_history": [response],
            }

        if state.get("is_first_message", True):
            answer = interrupt("How can I help you today?")
            state["user_query"] = answer
            chain = (
                chat_template_engagement_entry
                | self.chat_model.with_structured_output(EngagementDecision)
            )
            decision: EngagementDecision = chain.invoke(
                {"user_query": state["user_query"]}
            )
            _debug(
                "[workflow] node=engagement_with_user phase=1 decision needs_clarification=%s response_length=%s",
                decision.needs_clarification,
                len(decision.response or ""),
            )
        else:
            prev_question = state.get("engagement_response") or "Please clarify your request."
            _debug("[workflow] node=engagement_with_user waiting for clarification interrupt")
            answer = interrupt(prev_question)
            state["user_query"] = answer
            chain = (
                chat_template_engagement_followup
                | self.chat_model.with_structured_output(EngagementDecision)
            )
            decision: EngagementDecision = chain.invoke(
                {
                    "user_query": state["user_query"],
                    "conversation_history": state["chat_history"],
                }
            )
            _debug(
                "[workflow] node=engagement_with_user followup decision needs_clarification=%s response_length=%s",
                decision.needs_clarification,
                len(decision.response or ""),
            )

        return {
            "user_query": answer,
            "needs_clarification": decision.needs_clarification,
            "engagement_response": decision.response,
            "chat_history": [
                HumanMessage(content=state["user_query"]),
                AIMessage(content=decision.response),
            ],
            "is_first_message": False,
        }

    def rag_search_workflow(self, state: SmartFeedbackState) -> dict:

        _debug("[workflow] node=rag_search_workflow start")
        results: list[dict] = self._rag_agent.search(query=state["user_query"], top_k=3)
        _debug("[workflow] node=rag_search_workflow results=%s", len(results))
        return {"rag_results": results}

    def analysis_agent(self, state: SmartFeedbackState) -> dict:
        _debug("[workflow] node=analysis_agent start")
        chain = chat_template_analysis_agent | self.chat_model.with_structured_output(
            AnalysisAgentResult
        )
        result: AnalysisAgentResult = chain.invoke({"user_query": state["user_query"]})
        _debug(
            "[workflow] node=analysis_agent result intent=%s sentiment=%s urgency=%s issue_type=%s language=%s",
            _enum_value(result.intent),
            _enum_value(result.sentiment),
            _enum_value(result.urgency),
            _enum_value(result.issue_type),
            _enum_value(result.language),
        )
        return {"analysis_agent_result": result}

    def create_ticket(self, state: SmartFeedbackState) -> dict:
        _debug("[workflow] node=create_ticket start")
        # Build a plain-text summary from the full conversation so far.
        # Structured fields (severity, intent, etc.) will be added here later
        # once analysis_agent results are wired through.
        lines = []
        for msg in state.get("prior_history", []):
            role = "User" if msg.get("sender") == "user" else "Agent"
            lines.append(f"{role}: {msg.get('content', '')}")
        lines.append(f"User: {state['user_query']}")
        _debug("[workflow] node=create_ticket summary_lines=%s", len(lines))
        return {"ticket_summary": "\n".join(lines)}

    ###
    ### Triage
    ###
    def human_ticket_assessment(self, state: SmartFeedbackState) -> SmartFeedbackState:
        _debug("[workflow] node=human_ticket_assessment waiting for interrupt")
        interrupt_data: InterruptData = {
            "content": "Does this ticket look correct?",
            "options": ["ok", "redo", "additional"],
        }
        assessment = interrupt(interrupt_data)
        val = assessment.strip().lower() if isinstance(assessment, str) else ""
        if val == "ok":
            return {"human_assessment": HumanAssessment.OK}
        if val == "redo":
            return {"human_assessment": HumanAssessment.REDO_TICKET}
        return {"human_assessment": HumanAssessment.ADD_ADDITIONAL_CONTENT}

    def add_additional_information_to_ticket(self, state: SmartFeedbackState) -> str:
        _debug("[workflow] node=add_additional_information_to_ticket waiting for interrupt")
        interrupt_data: InterruptData = {
            "content": "What would you like to change or add?",
            "options": [],
        }
        user_comment = interrupt(interrupt_data)
        final_ticket_content = (
            state.get("ticket_summary") + f"\n\n**User Comment:**\n{user_comment}"
        )
        return {
            "ticket_summary": final_ticket_content,
            "ticket_content": final_ticket_content,
            "chat_history": HumanMessage(user_comment),
        }

    def route_human_assessment(self, state: SmartFeedbackState) -> str:
        route = state.get("human_assessment", HumanAssessment.OK)
        _debug("[workflow] route=human_assessment -> %s", route)
        return route

    def rag_response_ok(self, state: SmartFeedbackState) -> SmartFeedbackState:
        _debug("[workflow] node=rag_response_ok start")
        rag_response_ok_chain = chat_template_rag_ok_response | self.chat_model
        rag_ok = rag_response_ok_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "rag_results": state.get("rag_results"),
            }
        )
        return {"final_user_response": rag_ok.content, "chat_history": rag_ok}

    def triage_request(self, state: SmartFeedbackState) -> SmartFeedbackState:
        _debug("[workflow] node=triage_request start")
        # Reset the judge iteration counter for a new triage flow
        self._judge_current_iteration = 0

        triage_request_chain = (
            chat_template_triage_support_level
            | self.chat_model.with_structured_output(IncidentAssessment)
        )

        # Populate judge_feedback if judge has provided feedback
        judge_feedback: str = ""
        if state.get("incident_assessment_judge"):
            latest_judge = state["incident_assessment_judge"][-1]
            latest_assessment = state["incident_assessment"][-1]
            judge_feedback = f"Your assessment: {latest_assessment.model_dump()} and the judge assessment: {latest_judge.model_dump()}"

        only_user_interactions = [
            i.content for i in state.get("chat_history") if isinstance(i, HumanMessage)
        ][:3]
        incident_assessment = triage_request_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "chat_history": "\n".join(only_user_interactions),
                "judge_feedback": judge_feedback,
            }
        )
        _debug(
            "[workflow] node=triage_request assessment severity=%s team=%s",
            incident_assessment.severity,
            _enum_value(incident_assessment.support_team),
        )
        return {"incident_assessment": [incident_assessment]}

    def judge_triage_request(self, state: SmartFeedbackState) -> SmartFeedbackState:
        triage_judge_chain = (
            chat_template_triage_judge
            | self.chat_model.with_structured_output(IncidentAssessmentJudge)
        )
        judged_incident_assessment = triage_judge_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "chat_history": state.get("chat_history"),
                "incident_assessment": state.get("incident_assessment")[-1],
            }
        )
        self._judge_current_iteration += 1
        return {"incident_assessment_judge": [judged_incident_assessment]}

    def route_judge(self, state: SmartFeedbackState) -> str:
        if self._judge_current_iteration >= self.judge_max_iterations:
            _debug(
                "[workflow] route=judge max_iterations reached=%s -> %s",
                self._judge_current_iteration,
                TriageJudgeDecision.OK,
            )
            return TriageJudgeDecision.OK  # Force exit
        latest_judge = state.get("incident_assessment_judge", [])[-1]
        _debug("[workflow] route=judge -> %s", latest_judge.overall_assessment)
        return latest_judge.overall_assessment

    def formulate_ticket_content(self, state: SmartFeedbackState) -> SmartFeedbackState:
        _debug("[workflow] node=formulate_ticket_content start")
        ticket_content_chain = chat_template_ticket_creation | self.chat_model
        only_user_interactions = [
            i.content for i in state.get("chat_history") if isinstance(i, HumanMessage)
        ][:3]
        ticket_content = ticket_content_chain.invoke(
            {
                "user_issue": state.get("incident_assessment")[-1].user_issue,
                "severity": state.get("incident_assessment")[-1].severity,
                "reason": state.get("incident_assessment")[-1].reason,
                "user_query": state.get("user_query"),
                "chat_history": "\n".join(only_user_interactions),
            }
        )
        ticket_content_text = ticket_content.content
        _debug(
            "[workflow] node=formulate_ticket_content content_length=%s",
            len(ticket_content_text or ""),
        )
        return {
            "ticket_summary": ticket_content_text,
            "ticket_content": ticket_content_text,
            "chat_history": [ticket_content],
        }

    @staticmethod
    def _parse_ticket_sections(ticket_summary: str) -> dict:
        import re

        def extract(pattern):
            m = re.search(pattern, ticket_summary, re.DOTALL | re.IGNORECASE)
            return m.group(1).strip() if m else None

        title        = extract(r"\*\*Title\*\*[:\s]+(.*?)(?=\n+\*\*|\Z)")
        description  = extract(r"\*\*Description\*\*[:\s]+(.*?)(?=\n+\*\*Severity|\n+\*\*Next Steps|\n+\*\*User Comment|\Z)")
        next_steps   = extract(r"\*\*Next Steps\*\*[:\s]+(.*?)(?=\n+\*\*User Comment|\Z)")
        user_comment = extract(r"\*\*User Comment\*\*[:\s]+(.*?)(?:\Z)")

        desc_parts = [p for p in [description, f"**User Comment:**\n{user_comment}" if user_comment else None] if p]

        return {
            "title":             title,
            "description":       "\n\n".join(desc_parts) if desc_parts else None,
            "recommended_action": next_steps,
        }

    def update_ticket(self, state: SmartFeedbackState) -> dict:
        issue_id = state.get("issue_id") or getattr(self.issue, "id", None)
        user_id = state.get("user_id") or self.user_id
        if not issue_id or not user_id:
            _debug(
                "[workflow] node=update_ticket skipped missing issue_id/user_id issue_id=%s user_id=%s",
                issue_id,
                user_id,
            )
            return {}

        record = _ticket_record_from_state(state, self.graph_config)
        db = self.db or SessionLocal()
        should_close_db = self.db is None
        try:
            ticket = Ticket(
                issue_id=issue_id,
                user_id=user_id,
                summary=record["summary"],
                description=record["description"],
                issue_type=record["issue_type"],
                priority=record["priority"],
                team=record["team"],
                status=TICKET_STATUS_NEW,
                labels=record["labels"],
                recommended_action=record["recommended_action"],
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)
            _debug("[workflow] node=update_ticket saved ticket_id=%s", ticket.id)
            return {"ticket_id": ticket.id}
        finally:
            if should_close_db:
                db.close()

    def generate_ticket_created_response(self, state: SmartFeedbackState):
        _debug(
            "[workflow] node=generate_ticket_created_response ticket_id=%s",
            state.get("ticket_id"),
        )
        return {
            "final_user_response": f"Ticket with id {state.get('ticket_id')} was successfully created!"
        }

    def add_ticket_to_jira(self, state: SmartFeedbackState):
        _debug("[workflow] node=add_ticket_to_jira start")
        record = _ticket_record_from_state(state, self.graph_config)
        _debug(
            "[workflow] node=add_ticket_to_jira parsed summary_length=%s description_length=%s",
            len(record["summary"] or ""),
            len(record["description"] or ""),
        )

        try:
            issue = JiraClient().create_issue(record)
        except (JiraConfigError, JiraApiError) as error:
            _debug_exception("[workflow] node=add_ticket_to_jira failed: %s", error)
            return {
                "final_user_response": (
                    "Your ticket was prepared, but I could not create it in Jira. "
                    f"Reason: {error}"
                )
            }

        issue_key = issue.get("key") or ""
        issue_id = issue.get("id") or issue_key
        jira_url = jira_browse_url(issue_key) if issue_key else ""
        response = (
            f"Ticket {issue_key} was successfully created in Jira!"
            if issue_key
            else "Ticket was successfully created in Jira!"
        )
        _debug(
            "[workflow] node=add_ticket_to_jira created issue_id=%s issue_key=%s",
            issue_id,
            issue_key,
        )

        return {
            "ticket_id": issue_key or issue_id,
            "final_user_response": response,
            "jira_ticket": {
                "id": issue_id,
                "key": issue_key,
                "url": jira_url,
            },
        }

    def generate_chat_summary(self, state: SmartFeedbackState) -> dict:
        history_lines = []
        for m in state.get("chat_history", []):
            role = "User" if isinstance(m, HumanMessage) else "Agent"
            history_lines.append(f"{role}: {m.content}")
        history = "\n".join(history_lines) or "(no conversation history)"
        prompt = (
            f"Summarise the following support conversation in 2 concise sentences, "
            f"focusing on the user's issue and how it was resolved:\n\n{history}"
        )
        response = self.chat_model.invoke(prompt)
        return {"final_user_response": response.content}

    def end_node(self, state: SmartFeedbackState):
        _debug(
            "[workflow] node=end_node final_response=%s ticket_id=%s",
            bool(state.get("final_user_response")),
            state.get("ticket_id"),
        )
        return state

    # Public entry point
    def run(self, user_query: str, is_first_message: bool = True, stream: bool = False):
        initial_state: SmartFeedbackState = {
            "issue_id": "",
            "user_id": "",
            "user_query": user_query,
            "chat_history": [],
            "needs_clarification": False,
            "ticket_id": "",
            "analysis_agent_result": None,
            "rag_results": [],
            "rag_workflow_state": {},
            "triage_workflow_state": {},
            "engagement_response": "",
            "ticket_summary": "",
            "ticket_content": "",
            "jira_ticket": {},
        }

        if stream:
            for chunk in self._workflow.stream(initial_state, config=self.graph_config):
                print(chunk)
            return None

        return self._workflow.invoke(initial_state, config=self.graph_config)
