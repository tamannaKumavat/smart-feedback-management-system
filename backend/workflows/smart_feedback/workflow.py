from langgraph.graph import END, START, StateGraph
from langchain_core.messages import AIMessage, HumanMessage
from typing import Any

from workflows.smart_feedback.data_models import (
    SmartFeedbackState,
    AnalysisAgentResult,
    EngagementDecision,
)
from workflows.triage.workflow import TriageWorkflow
from workflows.smart_feedback.prompt_templates import (
    chat_template_analysis_agent,
    chat_template_engagement_entry,
    chat_template_engagement_followup,
    chat_template_engagement_rag,
)
from workflows.smart_feedback.rag_agent import RAGAgent, RELEVANCE_THRESHOLD


def _format_history(prior_history: list[dict]) -> str:
    if not prior_history:
        return "(no prior conversation)"
    lines = []
    for msg in prior_history:
        role = "User" if msg.get("sender") == "user" else "Support Agent"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def build_workflow() -> "SmartFeedbackWorkflow":
    """Construct a SmartFeedbackWorkflow with the correct chat model for the current config."""
    from config import MOCK_MODE
    if MOCK_MODE:
        chat_model = _build_mock_chat_model()
    else:
        chat_model = _build_live_chat_model()
    return SmartFeedbackWorkflow(chat_model)


def _build_live_chat_model():
    from langchain_ibm import ChatWatsonx
    from config import WATSONX_API_KEY, WATSONX_MODEL_ID, WATSONX_PROJECT_ID, WATSONX_URL
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

    def __init__(self, chat_model: Any):
        self.chat_model = chat_model
        self._rag_agent = RAGAgent()
        self._workflow: StateGraph = None
        self._generate_workflow()

    @property
    def workflow(self):
        return self._workflow

    def _generate_workflow(self):
        workflow = StateGraph(SmartFeedbackState)

        workflow.add_node("engagement_with_user", self.engagement_with_user)
        workflow.add_node("create_ticket", self.create_ticket)
        workflow.add_node("analysis_agent", self.analysis_agent)
        workflow.add_node("rag_search_workflow", self.rag_search_workflow)
        workflow.add_node("triage_workflow", self.triage_workflow)

        workflow.add_edge(START, "engagement_with_user")

        workflow.add_conditional_edges(
            "engagement_with_user",
            self._route_engagement,
            {
                "clarify": END,
                "proceed": "create_ticket",
                "respond": END,
                "triage": "triage_workflow",
            },
        )

        workflow.add_edge("create_ticket", "analysis_agent")
        workflow.add_edge("create_ticket", "rag_search_workflow")

        workflow.add_edge("analysis_agent", "engagement_with_user")
        workflow.add_edge("rag_search_workflow", "engagement_with_user")

        workflow.add_edge("triage_workflow", END)

        self._workflow = workflow.compile()

    def _route_engagement(self, state: SmartFeedbackState) -> str:
        if state.get("analysis_agent_result") is None:
            return "clarify" if state.get("needs_clarification", False) else "proceed"

        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0) >= RELEVANCE_THRESHOLD
        )
        return "respond" if rag_sufficient else "triage"

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
            response: AIMessage = chain.invoke({
                "user_query": state["user_query"],
                "rag_context": rag_context,
                "conversation_history": conversation_history,
            })
            return {
                "engagement_response": response.content,
                "chat_history": [response],
                "ready_to_create_ticket": True,
            }

        # Phase 1: decide clarify vs proceed
        if state.get("is_first_message", True):
            chain = chat_template_engagement_entry | self.chat_model.with_structured_output(EngagementDecision)
            decision: EngagementDecision = chain.invoke({"user_query": state["user_query"]})
        else:
            conversation_history = _format_history(state.get("prior_history", []))
            chain = chat_template_engagement_followup | self.chat_model.with_structured_output(EngagementDecision)
            decision: EngagementDecision = chain.invoke({
                "user_query": state["user_query"],
                "conversation_history": conversation_history,
            })

        return {
            "needs_clarification": decision.needs_clarification,
            "engagement_response": decision.response,
            "chat_history": [
                HumanMessage(content=state["user_query"]),
                AIMessage(content=decision.response),
            ],
        }

    def rag_search_workflow(self, state: SmartFeedbackState) -> dict:
        results: list[dict] = self._rag_agent.search(
            query=state["user_query"], top_k=3
        )
        return {"rag_results": results}

    def analysis_agent(self, state: SmartFeedbackState) -> dict:
        chain = (
            chat_template_analysis_agent
            | self.chat_model.with_structured_output(AnalysisAgentResult)
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

    def triage_workflow(self, state: SmartFeedbackState) -> dict:
        triage = TriageWorkflow(self.chat_model)
        final_state = triage.run(
            user_query=state["user_query"],
            rag_results=state.get("rag_results", []),
        )
        return {"triage_workflow_state": final_state}

    def run(self, user_query: str, prior_history: list[dict] | None = None) -> dict:
        prior_history = prior_history or []
        initial_state: SmartFeedbackState = {
            "user_query": user_query,
            "prior_history": prior_history,
            "chat_history": [],
            "is_first_message": not bool(prior_history),
            "needs_clarification": False,
            "human_assessment": "",
            "ticket_id": "",
            "analysis_agent_result": None,
            "rag_results": [],
            "rag_workflow_state": {},
            "triage_workflow_state": {},
            "engagement_response": "",
            "ready_to_create_ticket": False,
            "ticket_summary": "",
        }
        return self._workflow.invoke(initial_state)
