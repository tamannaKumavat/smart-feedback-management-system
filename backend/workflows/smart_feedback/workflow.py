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
from langgraph.types import interrupt



class SmartFeedbackWorkflow:
    """Coordinates the full smart-feedback pipeline.

    Graph flow:
        START
        engagement_with_user  [Phase 1 — entry point]
                LLM decides: acknowledge (clear) OR ask clarification (vague)
                needs_clarification=True ---> END
                (clarifying question returned to user)
                needs_clarification=False ---> create_ticket (placeholder)
                then=> analysis_agent + rag_search_workflow ---(fan-in — both must finish)
                 engagement_with_user  [Phase 2 — reply]
                RAG sufficient---> END else  RAG insufficient --->triage_workflow ──► END

    Parameters:
        chat_model (Any): A LangChain chat-model integration (e.g. ChatWatsonx).
    """

    def __init__(self, chat_model: Any, checkpointer: Any = None):
        self.chat_model = chat_model
        self._rag_agent = RAGAgent()
        self._workflow: StateGraph = None
        self.checkpointer = checkpointer
        self._generate_workflow()

    @property
    def workflow(self):
        return self._workflow

    # Graph & Flow construction
    def _generate_workflow(self):
        workflow = StateGraph(SmartFeedbackState)

        workflow.add_node("engagement_with_user", self.engagement_with_user)
        workflow.add_node("create_ticket", self.create_ticket)
        workflow.add_node("analysis_agent", self.analysis_agent)
        workflow.add_node("rag_search_workflow", self.rag_search_workflow)
        workflow.add_node("triage_workflow", self.triage_workflow)

        # Entry point
        workflow.add_edge(START, "engagement_with_user")

        # After engagement Phase 1/2 — three possible routes
        workflow.add_conditional_edges(
            "engagement_with_user",
            self._route_engagement,
            {
                "clarify": END,          # Phase 1: vague query — question returned to user
                "proceed": "create_ticket",  # Phase 1: clear query — proceed through pipeline
                "respond": END,          # Phase 2: RAG sufficient — answer returned to user
                "triage": "triage_workflow", # Phase 2: RAG insufficient — escalate
            },
        )

        # create_ticket fans out to BOTH agents in parallel
        workflow.add_edge("create_ticket", "analysis_agent")
        workflow.add_edge("create_ticket", "rag_search_workflow")

        # Fan-in: engagement_with_user (Phase 2) runs only after BOTH complete
        workflow.add_edge("analysis_agent", "engagement_with_user")
        workflow.add_edge("rag_search_workflow", "engagement_with_user")

        workflow.add_edge("triage_workflow", END)

        self._workflow = workflow.compile(checkpointer=self.checkpointer)

    # Routing
    def _route_engagement(self, state: SmartFeedbackState) -> str:
        """Called after every execution of engagement_with_user.

        Phase 1 (analysis_agent_result is None — parallel branches not yet run):
          - "clarify"  if the LLM asked for more information
          - "proceed"  if the query was understood

        Phase 2 (analysis_agent_result is set — both parallel branches finished):
          - "respond"  if RAG results are good enough to answer the user
          - "triage"   if RAG results are insufficient and escalation is needed
        """
        # Phase 1: parallel branches have not run yet
        if state.get("analysis_agent_result") is None:
            return "clarify" if state.get("needs_clarification", False) else "proceed"

        # Phase 2: parallel branches completed — decide based on RAG quality
        results = state.get("rag_results", [])
        rag_sufficient = (
            bool(results)
            and max((r.get("score", 0.0) for r in results), default=0.0) >= RELEVANCE_THRESHOLD
        )
        return "respond" if rag_sufficient else "triage"
    
    # Engagement Agent  (entry point + final reply)
    def engagement_with_user(self, state: SmartFeedbackState) -> dict:
        """Phase 1 — entry point.

        Uses structured output to decide whether to acknowledge the request
        or ask a single clarifying question when the query is too vague.

        Phase 2 — reply with RAG results.

        Called again after analysis_agent and rag_search_workflow both finish.
        Uses the retrieved context to compose a concrete answer for the user.
        """
        if state.get("analysis_agent_result") is not None:
            #  Phase 2: compose answer from RAG context 
            rag_results = state.get("rag_results", [])
            rag_context = "\n\n".join(
                f"[{r['source']}] {r['text']}" for r in rag_results
            )
            chain = chat_template_engagement_rag | self.chat_model
            response: AIMessage = chain.invoke(
                {"user_query": state["user_query"], "rag_context": rag_context}
            )
            return {
                "engagement_response": response.content,
                "chat_history": [response],
            }

        # Phase 1: warm greeting on first message, plain follow-up on subsequent ones
        template = (
            chat_template_engagement_entry
            if state.get("is_first_message", True)
            else chat_template_engagement_followup
        )
        answer = interrupt("How can I help you with today?")
        state["user_query"] = answer
        chain = template | self.chat_model.with_structured_output(EngagementDecision)
        decision: EngagementDecision = chain.invoke({"user_query": state["user_query"]})

        return {
            "needs_clarification": decision.needs_clarification,
            "engagement_response": decision.response,
            "chat_history": [
                HumanMessage(content=state["user_query"]),
                AIMessage(content=decision.response),
            ],
        }

    # RAG Agent
    def rag_search_workflow(self, state: SmartFeedbackState) -> dict:
        """Searches the knowledge base for documents relevant to the user query.

        Runs in parallel with analysis_agent after create_ticket.
        Results are written to state["rag_results"] for Phase 2 of engagement.
        """
        results: list[dict] = self._rag_agent.search(
            query=state["user_query"], top_k=3
        )
        return {"rag_results": results}

    # Analysis Agent  (parallel with RAG)
    def analysis_agent(self, state: SmartFeedbackState) -> dict:
        """Classifies the user query by intent, sentiment, urgency and issue type.

        Runs in parallel with rag_search_workflow after create_ticket.
        Result triggers the fan-in back to engagement_with_user Phase 2.
        """
        chain = (
            chat_template_analysis_agent
            | self.chat_model.with_structured_output(AnalysisAgentResult)
        )
        result: AnalysisAgentResult = chain.invoke({"user_query": state["user_query"]})
        return {"analysis_agent_result": result}

    # Remaining nodes
    def create_ticket(self, _state: SmartFeedbackState) -> dict:
        # Placeholder: ticket creation will be added in a follow-up.
        return {}

    def triage_workflow(self, state: SmartFeedbackState) -> dict:
        triage = TriageWorkflow(self.chat_model, self.checkpointer)
        final_state = triage.run(
            user_query=state["user_query"],
            rag_results=state.get("rag_results", []),
        )
        return {"triage_workflow_state": final_state}

    # Public entry point
    def run(self, user_query: str, is_first_message: bool = True, stream: bool = False, **kwargs):
        initial_state: SmartFeedbackState = {
            "user_query": user_query,
            "chat_history": [],
            "is_first_message": is_first_message,
            "needs_clarification": False,
            "human_assessment": "",
            "ticket_id": "",
            "analysis_agent_result": None,
            "rag_results": [],
            "rag_workflow_state": {},
            "triage_workflow_state": {},
            "engagement_response": "",
        }

        if stream:
            for chunk in self._workflow.stream(initial_state, **kwargs):
                print(chunk)
            return None

        return self._workflow.invoke(initial_state, **kwargs)
