from langgraph.graph import END, START, StateGraph
from langchain_core.messages import AIMessage, HumanMessage
from typing import Any

from workflows.smart_feedback.data_models import (
    SmartFeedbackState,
    AnalysisAgentResult,
    EngagementDecision,
)
from workflows.smart_feedback.prompt_templates import (
    chat_template_analysis_agent,
    chat_template_engagement_entry,
    chat_template_engagement_followup,
    chat_template_engagement_rag,
)
from workflows.smart_feedback.rag_agent import RAGAgent, RELEVANCE_THRESHOLD
from langgraph.types import interrupt

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


def _format_history(prior_history: list[dict]) -> str:
    if not prior_history:
        return "(no prior conversation)"
    lines = []
    for msg in prior_history:
        role = "User" if msg.get("sender") == "user" else "Support Agent"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def build_workflow(
    checkpointer: Any = None, graph_config: dict = {}
) -> "SmartFeedbackWorkflow":
    """Construct a SmartFeedbackWorkflow with the correct chat model for the current config."""
    from config import MOCK_MODE

    if MOCK_MODE:
        chat_model = _build_mock_chat_model()
    else:
        chat_model = _build_live_chat_model()
    return SmartFeedbackWorkflow(
        chat_model, checkpointer=checkpointer, graph_config=graph_config
    )


def _build_live_chat_model():
    from langchain_ibm import ChatWatsonx
    from config import (
        WATSONX_API_KEY,
        WATSONX_MODEL_ID,
        WATSONX_PROJECT_ID,
        WATSONX_URL,
    )

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
                try:
                    return schema()
                except Exception:
                    init_kwargs = {}
                    for field_name, field_info in schema.model_fields.items():
                        if field_info.is_required():
                            ann = field_info.annotation
                            if hasattr(ann, "__members__"):
                                init_kwargs[field_name] = list(ann)[0]
                            elif hasattr(ann, "__args__"):
                                init_kwargs[field_name] = ann.__args__[0]
                    return schema(**init_kwargs)

            return RunnableLambda(build_default)

        @property
        def _llm_type(self) -> str:
            return "mock"

    return _MockChatModel()


def _format_history(prior_history: list[dict]) -> str:
    if not prior_history:
        return "(no prior conversation)"
    lines = []
    for msg in prior_history:
        role = "User" if msg.get("sender") == "user" else "Support Agent"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def _build_live_chat_model():
    from langchain_ibm import ChatWatsonx
    from config import (
        WATSONX_API_KEY,
        WATSONX_MODEL_ID,
        WATSONX_PROJECT_ID,
        WATSONX_URL,
    )

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
                try:
                    return schema()
                except Exception:
                    init_kwargs = {}
                    for field_name, field_info in schema.model_fields.items():
                        if field_info.is_required():
                            ann = field_info.annotation
                            if hasattr(ann, "__members__"):
                                init_kwargs[field_name] = list(ann)[0]
                            elif hasattr(ann, "__args__"):
                                init_kwargs[field_name] = ann.__args__[0]
                    return schema(**init_kwargs)

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
        self, chat_model: Any, checkpointer: Any = None, graph_config: dict = {}
    ):
        self.chat_model = chat_model
        self._rag_agent = RAGAgent()
        self._workflow: StateGraph = None
        self.checkpointer = checkpointer
        self.chat_model = chat_model
        self.graph_config = graph_config
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
            self._route_rag_user_assessment,  # New method to check RAG sufficiency
            {
                "yes": "end_node",  # RAG answer sufficient -> User can end now
                "no": "engagement_with_user",  # RAG result insufficient -> clarify
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
        workflow.add_edge("add_additional_information_to_ticket", "update_ticket")
        workflow.add_edge("update_ticket", "generate_ticket_created_response")
        workflow.add_edge("generate_ticket_created_response", "end_node")
        workflow.add_edge("end_node", END)

        self._workflow = workflow.compile(checkpointer=self.checkpointer)

    def analysis_rag_results(self, state: SmartFeedbackState):
        return state

    def _route_engagement(self, state: SmartFeedbackState) -> str:
        # Phase 1: Check if clarification is needed
        if state.get("analysis_agent_result") is None:
            return "clarify" if state.get("needs_clarification", False) else "proceed"
        # If we reach here, it's Phase 2 (RAG results are available)
        print(
            f"user assessment: {state.get('rag_results', []) and state.get('engagement_response', '')}, Engagement response: {state.get('engagement_response', '')}"
        )
        if state.get("rag_results", []) and state.get("engagement_response", ""):
            return "rag_user_assessment"

        return "proceed"  # Proceed to create_ticket (fan-out)

    def _route_rag_results(self, state: SmartFeedbackState) -> str:
        # Check RAG sufficiency
        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0)
            >= RELEVANCE_THRESHOLD
        )
        return "respond" if rag_sufficient else "triage"

    def _route_engagement_phase2(self, state: SmartFeedbackState) -> str:
        # Phase 2: Check if RAG was sufficient (already handled in _route_rag_results)
        # This is a fallback for engagement_with_user in Phase 2
        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0)
            >= RELEVANCE_THRESHOLD
        )
        return "respond" if rag_sufficient else "triage"

    def rag_result_user_assessment(self, state: SmartFeedbackState):
        response = interrupt(
            "Please state if this answers you question. Either yes or no"
        )
        updated_state = {}
        if response.lower() not in ["yes", "no"]:
            response = "no"
        if response.lower() == "no":
            updated_state["rag_results"] = []
            updated_state["analysis_agent_result"] = None
        updated_state["rag_user_assessment"] = response.lower()

        return updated_state

    def _route_rag_user_assessment(self, state: SmartFeedbackState):
        if state.get("rag_user_assessment", "no"):
            return "no"
        return "end"

    def engagement_with_user(self, state: SmartFeedbackState) -> dict:
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
            return {
                "engagement_response": response.content,
                "chat_history": [response],
            }

        if state.get("is_first_message", True):
            answer = interrupt("How can I help you with today?")
            state["user_query"] = answer
            chain = (
                chat_template_engagement_entry
                | self.chat_model.with_structured_output(EngagementDecision)
            )
            decision: EngagementDecision = chain.invoke(
                {"user_query": state["user_query"]}
            )
        else:
            answer = interrupt("Please clarify request.")
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

        results: list[dict] = self._rag_agent.search(query=state["user_query"], top_k=3)
        return {"rag_results": results}

    def analysis_agent(self, state: SmartFeedbackState) -> dict:
        chain = chat_template_analysis_agent | self.chat_model.with_structured_output(
            AnalysisAgentResult
        )
        result: AnalysisAgentResult = chain.invoke({"user_query": state["user_query"]})
        return {"analysis_agent_result": result}

    def create_ticket(self, state: SmartFeedbackState) -> dict:
        # Build a plain-text summary from the full conversation so far.
        # Structured fields (severity, intent, etc.) will be added here later
        # once analysis_agent results are wired through.
        lines = []
        for msg in state.get("prior_history", []):
            role = "User" if msg.get("sender") == "user" else "Agent"
            lines.append(f"{role}: {msg.get('content', '')}")
        lines.append(f"User: {state['user_query']}")
        return {"ticket_summary": "\n".join(lines)}

    ###
    ### Triage
    ###
    def human_ticket_assessment(self, state: SmartFeedbackState) -> SmartFeedbackState:
        assessment = interrupt(
            f"Please review the ticket answer one of the following options: {', '.join([i.value for i in HumanAssessment])}"
        )
        if assessment in [i.value for i in HumanAssessment]:
            return {"human_assessment": assessment}
        return {"human_assessment": HumanAssessment.OK}

    def add_additional_information_to_ticket(self, state: SmartFeedbackState) -> str:
        user_comment = interrupt("Please add you comment to the ticket")
        final_ticket_content = (
            state.get("ticket_content") + f"\nUSER COMMENT:\n{user_comment}"
        )
        return {
            "ticket_content": final_ticket_content,
            "chat_history": HumanMessage(user_comment),
        }

    def route_human_assessment(self, state: SmartFeedbackState) -> str:
        return state.get("human_assessment", HumanAssessment.OK)

    def rag_response_ok(self, state: SmartFeedbackState) -> SmartFeedbackState:
        rag_response_ok_chain = chat_template_rag_ok_response | self.chat_model
        rag_ok = rag_response_ok_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "rag_results": state.get("rag_results"),
            }
        )
        return {"final_user_response": rag_ok.content, "chat_history": rag_ok}

    def triage_request(self, state: SmartFeedbackState) -> SmartFeedbackState:
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
        return {"incident_assessment": [incident_assessment]}

    def judge_triage_request(self, state: SmartFeedbackState) -> SmartFeedbackState:
        print(
            f"[judge_triage_request] Invoked. Iteration: {self._judge_current_iteration + 1}"
        )
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
        print(
            f"[judge_triage_request] Judge decision: {judged_incident_assessment.overall_assessment}"
        )
        return {"incident_assessment_judge": [judged_incident_assessment]}

    def route_judge(self, state: SmartFeedbackState) -> str:
        if self._judge_current_iteration >= self.judge_max_iterations:
            return TriageJudgeDecision.OK  # Force exit
        latest_judge = state.get("incident_assessment_judge", [])[-1]
        return latest_judge.overall_assessment

    def formulate_ticket_content(self, state: SmartFeedbackState) -> SmartFeedbackState:
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
        return {
            "ticket_content": ticket_content.content,
            "chat_history": ticket_content,
        }

    def update_ticket(self, state: SmartFeedbackState) -> SmartFeedbackState:
        """TODO: How do we handle created tickets? Do we save them in the database so we can use them in the future
        as responses?
        """
        print("TODO: Adding ticket to database - for future use")
        return state

    def generate_ticket_created_response(self, state: SmartFeedbackState):
        return {
            "final_user_response": f"Ticket with id {state.get('ticket_id')} was successfully created!"
        }

    def end_node(self, state: SmartFeedbackState):
        return state

    # Public entry point
    def run(self, user_query: str, is_first_message: bool = True, stream: bool = False):
        initial_state: SmartFeedbackState = {
            "user_query": user_query,
            "chat_history": [],
            "needs_clarification": False,
            "ticket_id": "",
            "analysis_agent_result": None,
            "rag_results": [],
            "rag_workflow_state": {},
            "triage_workflow_state": {},
            "engagement_response": "",
        }

        if stream:
            for chunk in self._workflow.stream(initial_state, config=self.graph_config):
                print(chunk)
            return None

        return self._workflow.invoke(initial_state, config=self.graph_config)
