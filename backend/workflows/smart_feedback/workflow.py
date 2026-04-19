from langgraph.graph import END, START, StateGraph
from typing import Any

from backend.workflows.smart_feedback.data_models import (
    SmartFeedbackState,
    AnalysisAgentResult,
)
from backend.workflows.triage.workflow import TriageWorkflow
from backend.workflows.smart_feedback.prompt_templates import (
    chat_template_analysis_agent,
)
from backend.workflows.smart_feedback.constants import AnswerCanBeGeneratedWithRAGResult


class SmartFeedbackWorkflow:
    """This is the main class where all the sub-workflows are coordinated.
    If a user requests something, this workflow is triggered.

    Parameters:
        chat_model: (Any): Is a langchain chat model integration. This can be anything like chat models specifically for watsonx or Ollama
    """

    def __init__(self, chat_model: Any):
        self.chat_model = chat_model
        self._workflow: StateGraph = None

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
        workflow.add_edge("engagement_with_user", "create_ticket")
        workflow.add_edge("create_ticket", "analysis_agent")
        workflow.add_edge("analysis_agent", "rag_search_workflow")
        workflow.add_conditional_edges(
            "decide_answer_can_be_generated_from_rag_result",
            self.decide_answer_can_be_generated_from_rag_result,
            {
                AnswerCanBeGeneratedWithRAGResult.YES: "engagement_with_user",
                AnswerCanBeGeneratedWithRAGResult.NO: "triage_workflow",
            },
        )
        workflow.add_edge("triage_workflow", END)
        self._workflow = workflow.compile()

    def engagement_with_user(self, state: SmartFeedbackState):
        """We need to decide how this engagement agent should look like. E.g. how we pass the different stuff e.g. the final result, clarifications, rag results to it."""
        # Placeholder!
        return state

    def create_ticket(self, state: SmartFeedbackState) -> dict:
        """Here the functionality of creating a ticket should be added!"""
        # Placeholder!
        return state

    def analysis_agent(self, state: SmartFeedbackState) -> dict:
        """The node for running the analysis agent. The return value will update the state of the analysis agent with the expected
        AnalysisAgentResult object.
        """
        analysis_agent_chain = (
            chat_template_analysis_agent
            | self.chat_model.with_structured_output(AnalysisAgentResult)
        )
        analysis_agent_result: AnalysisAgentResult = analysis_agent_chain.invoke(
            {"user_query": state["user_query"]}
        )
        return {"analysis_agent_result": analysis_agent_result}

    def decide_answer_can_be_generated_from_rag_result(self, state: SmartFeedbackState):
        """Decides if an answer can be generated from the RAG results.
        This can be through the check of found similarity scores or something like this.
        This is the step which decides, if we go down to the triage agent.
        """
        # Placeholder!
        return AnswerCanBeGeneratedWithRAGResult.NO

    def rag_search_workflow(self, state: SmartFeedbackState) -> dict:

        # Placeholder! Here the RAG workflow should be invoked and than returned!
        return {"rag_workflow_state": {}}

    def triage_workflow(self, state: SmartFeedbackState):
        """Runs the triage workflow and returns the final state of the workflow to the smart feedback state."""
        triage_workflow = TriageWorkflow(self.chat_model)
        final_triage_state = triage_workflow.run(
            user_query=state["user_query"], rag_results=state["rag_results"]
        )
        return {"triage_workflow_state": final_triage_state}
