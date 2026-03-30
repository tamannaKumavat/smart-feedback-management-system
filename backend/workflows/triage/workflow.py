from langchain_ollama import ChatOllama
from langchain_core.messages import AIMessage
from langgraph.graph import END, START, StateGraph
from typing import Any

from backend.workflows.triage.data_models import (
    TriageState,
    RAGDecision,
    IncidentAssessment,
    IncidentAssessmentJudge,
)
from backend.workflows.triage.prompt_templates import (
    chat_template_rag_evaluation,
    chat_template_rag_ok_response,
    chat_template_clarification_response,
    chat_template_triage_judge,
    chat_template_triage_support_level,
)
from backend.workflows.triage.constants import (
    JUDGE_OK,
    JUDGE_REFINE,
    INCIDENT_ROUTE_HIGHER_LEVEL,
    INCIDENT_ROUTE_LEVEL_1,
    DECISION_CLARIFICATION,
    DECISION_NOT_SOLVABLE,
    DECISION_OK,
)

chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0")


class TriageWorkflow:
    def __init__(self, chat_model: Any, judge_max_iterations: int = 2):
        self.chat_model = chat_model
        self.judge_max_iterations: int = judge_max_iterations
        self._judge_current_iteration: int = 0

        self._workflow: StateGraph = None
        self._generate_workflow()

    @property
    def workflow(self):
        return self._workflow

    def _generate_workflow(self):
        workflow = StateGraph(TriageState)

        # Adding all the nodes
        workflow.add_node("evaluate_rag_response", self.evaluate_rag_response)
        workflow.add_node("rag_response_clarification", self.rag_response_clarification)
        workflow.add_node("rag_response_ok", self.rag_response_ok)

        workflow.add_node("triage_request", self.triage_request)
        workflow.add_node("judge_triage_request", self.judge_triage_request)
        workflow.add_node("decide_on_incidence_level", self.decide_on_incidence_level)
        workflow.add_node("create_level_1_ticket", self.create_level_1_ticket)
        workflow.add_node(
            "handle_higher_level_support_tickets",
            self.handle_higher_level_support_tickets,
        )
        workflow.add_node("add_ticket_to_database", self.add_ticket_to_database)
        workflow.add_node("ticket_created_answer", self.ticket_created_answer)

        # Adding all the edges

        workflow.add_edge(START, "evaluate_rag_response")
        workflow.add_conditional_edges(
            "evaluate_rag_response",
            self.route_evaluate_rag,
            {
                DECISION_OK: "rag_response_ok",
                DECISION_CLARIFICATION: "rag_response_clarification",
                DECISION_NOT_SOLVABLE: "triage_request",
            },
        )
        workflow.add_edge("rag_response_ok", END)
        workflow.add_edge("triage_request", "judge_triage_request")
        workflow.add_edge(
            "rag_response_clarification", END
        )  # This is for now just a placeholder. This should go to before the RAG was called.
        workflow.add_conditional_edges(
            "judge_triage_request",
            self.route_judge,
            {JUDGE_OK: "decide_on_incidence_level", JUDGE_REFINE: "triage_request"},
        )
        workflow.add_conditional_edges(
            "decide_on_incidence_level",
            self.route_incidence_level,
            {
                INCIDENT_ROUTE_LEVEL_1: "create_level_1_ticket",
                INCIDENT_ROUTE_HIGHER_LEVEL: "handle_higher_level_support_tickets",
            },
        )
        workflow.add_edge("create_level_1_ticket", "add_ticket_to_database")
        workflow.add_edge(
            "handle_higher_level_support_tickets", "add_ticket_to_database"
        )
        workflow.add_edge("add_ticket_to_database", "ticket_created_answer")
        workflow.add_edge("ticket_created_answer", END)

        # Finally compile workflow
        self._workflow = workflow.compile()

    def evaluate_rag_response(self, state: TriageState) -> TriageState:
        rag_evaluation_chain = (
            chat_template_rag_evaluation
            | self.chat_model.with_structured_output(RAGDecision)
        )
        rag_decision = rag_evaluation_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "rag_results": state.get("rag_results"),
            }
        )
        return {
            "rag_decision": rag_decision,
            "chat_history": AIMessage(str(rag_decision.model_dump())),
        }

    def route_evaluate_rag(self, state: TriageState) -> str:
        return state.get("rag_decision").decision

    def rag_response_clarification(self, state: TriageState) -> TriageState:
        rag_response_clarification_chain = (
            chat_template_clarification_response | self.chat_model
        )
        rag_clarification = rag_response_clarification_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "rag_results": state.get("rag_results"),
            }
        )
        return {
            "final_user_response": rag_clarification,
            "chat_history": rag_clarification,
        }

    def rag_response_ok(self, state: TriageState) -> TriageState:
        rag_response_ok_chain = chat_template_rag_ok_response | self.chat_model
        rag_ok = rag_response_ok_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "rag_results": state.get("rag_results"),
            }
        )
        return {"final_user_response": rag_ok.content, "chat_history": rag_ok}

    def triage_request(self, state: TriageState) -> TriageState:
        triage_request_chain = (
            chat_template_triage_support_level
            | chat_model.with_structured_output(IncidentAssessment)
        )
        judge_feedback: str = ""
        if self._judge_current_iteration > 0:
            judge_feedback = f"Your assessment: {state.get('incident_assessment').model_dump()} and the judge assessment {state.get('incident_assessment_judge').model_dump()}"
        incident_assessment = triage_request_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "chat_history": state.get("chat_history"),
                "judge_feedback": judge_feedback,
            }
        )
        return {"incident_assessment": incident_assessment}

    def judge_triage_request(self, state: TriageState) -> TriageState:
        triage_judge_chain = (
            chat_template_triage_judge
            | chat_model.with_structured_output(IncidentAssessmentJudge)
        )
        judged_incident_assessment = triage_judge_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "chat_history": state.get("chat_history"),
                "incident_assessment": state.get("incident_assessment"),
            }
        )
        self._judge_current_iteration += 1
        return {
            "incident_assessment_judge": judged_incident_assessment,
        }

    def route_judge(self, state: TriageState) -> str:
        if self._judge_current_iteration >= self.judge_max_iterations:
            return JUDGE_OK  # Max reached -> We just continue to not waste more time.
        return state["incident_assessment_judge"].overall_assessment

    def decide_on_incidence_level(self, state: TriageState) -> TriageState:
        return state

    def add_ticket_to_database(self, state: TriageState) -> TriageState:
        """TODO: How do we handle created tickets? Do we save them in the database so we can use them in the future
        as responses?
        """
        print("TODO: Adding ticket to database - for future use")
        return state

    def ticket_created_answer(self, state: TriageState):
        return {
            "final_user_response": f"Ticket with id {state.get('ticket_id')} was successfully created!"
        }

    def create_level_1_ticket(self, state: TriageState) -> TriageState:
        # TODO: We could create the summary of the message as incident
        print("TODO: Create level 1 ticket and return the id")
        return {"ticket_id": 9999}

    def handle_higher_level_support_tickets(self, state: TriageState) -> TriageState:
        """How should we handle higher support levels of incidents?
        Should we have like a directory where the different departments are described and than assign it?
        Should we do a human in the loop where the user can decide to which department the incident should be assigned to?
        Or some default route - to a human in the support which assess it?
        """
        return {"ticket_id": 1111}

    def route_incidence_level(self, state: TriageState) -> int:
        support_level = state.get("incident_assessment").support_level
        if support_level == 1:
            return INCIDENT_ROUTE_LEVEL_1
        else:
            return INCIDENT_ROUTE_HIGHER_LEVEL

    def run(self, user_query: str, rag_results: list = [], stream: bool = False):
        if stream:
            for chunk in self._workflow.stream(
                {"user_query": user_query, "rag_results": rag_results}):
                print(chunk)
        else:
            final_result = self._workflow.invoke(
                {"user_query": user_query, "rag_results": rag_results}
            )
            return final_result
