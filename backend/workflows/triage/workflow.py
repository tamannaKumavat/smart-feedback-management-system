from langchain_core.messages import AIMessage
from langgraph.graph import END, START, StateGraph
from typing import Any

from workflows.triage.data_models import (
    TriageState,
    RAGDecision,
    IncidentAssessment,
    IncidentAssessmentJudge,
)
from workflows.triage.prompt_templates import (
    chat_template_rag_evaluation,
    chat_template_rag_ok_response,
    chat_template_clarification_response,
    chat_template_triage_judge,
    chat_template_triage_support_level,
)
from workflows.triage.constants import (
    TriageJudgeDecision,
    RAGEvaluationDecision,
    HumanAssessment,
)


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

        # Adding all the edges
        workflow.add_edge(START, "evaluate_rag_response")
        workflow.add_conditional_edges(
            "evaluate_rag_response",
            self.route_evaluate_rag,
            {
                RAGEvaluationDecision.OK: "rag_response_ok",
                RAGEvaluationDecision.CLARIFICATION: "rag_response_clarification",
                RAGEvaluationDecision.NOT_SOLVABLE: "triage_request",
            },
        )
        workflow.add_edge("rag_response_ok", END)
        workflow.add_edge("rag_response_clarification", END)
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
        workflow.add_edge("generate_ticket_created_response", END)

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

    def human_ticket_assessment(self, state: TriageState) -> TriageState:
        # Simulate human assessment (e.g., check if ticket needs more info)
        # In a real app, this could be a human-in-the-loop API call or manual review
        # user_input: str = input()
        assessment = HumanAssessment.OK  # or HUMAN_ASSESSMENT_ADD_ADDITIONAL_CONTENT
        return {"human_assessment": assessment}

    def add_additional_information_to_ticket(self, state: TriageState) -> str:
        return state.get("human_assessment")

    def route_human_assessment(self, state: TriageState) -> str:
        return state.get("human_assessment")

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
                "clarification_response": state.get("incident_assessment_judge", ""),
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
            | self.chat_model.with_structured_output(IncidentAssessment)
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
            | self.chat_model.with_structured_output(IncidentAssessmentJudge)
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
        print(
            f"judge current iteration {self._judge_current_iteration} to max judge: {self.judge_max_iterations}"
        )
        if self._judge_current_iteration >= self.judge_max_iterations:
            return (
                TriageJudgeDecision.OK
            )  # Max reached -> We just continue to not waste more time.
        return state["incident_assessment_judge"].overall_assessment

    def formulate_ticket_content(self, state: TriageState) -> TriageState:
        return state

    def update_ticket(self, state: TriageState) -> TriageState:
        """TODO: How do we handle created tickets? Do we save them in the database so we can use them in the future
        as responses?
        """
        print("TODO: Adding ticket to database - for future use")
        return state

    def generate_ticket_created_response(self, state: TriageState):
        return {
            "final_user_response": f"Ticket with id {state.get('ticket_id')} was successfully created!"
        }

    def run(self, user_query: str, rag_results: list = [], stream: bool = False):
        if stream:
            for chunk in self._workflow.stream(
                {"user_query": user_query, "rag_results": rag_results}
            ):
                print(chunk)
        else:
            final_result = self._workflow.invoke(
                {"user_query": user_query, "rag_results": rag_results}
            )
            return final_result
