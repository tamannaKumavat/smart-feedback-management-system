from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph
from typing import Any
from langgraph.types import interrupt

from db import SessionLocal
from models.chat import TICKET_STATUS_NEW, Ticket

from workflows.triage.data_models import (
    TriageState,
    IncidentAssessment,
    IncidentAssessmentJudge,
)
from workflows.triage.prompt_templates import (
    chat_template_rag_ok_response,
    chat_template_clarification_response,
    chat_template_triage_judge,
    chat_template_triage_support_level,
    chat_template_ticket_creation
)
from workflows.triage.constants import (
    TriageJudgeDecision,
    HumanAssessment,
)


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


def _clean_ticket_text(text: str) -> str:
    return text.strip().replace("**", "")


def _split_ticket_content(ticket_content: str) -> tuple[str, str]:
    lines = [line.strip() for line in ticket_content.splitlines() if line.strip()]
    if not lines:
        return "Feedback ticket", ""

    title = ""
    description_lines = []
    in_description = False

    for line in lines:
        cleaned = _clean_ticket_text(line)
        label, separator, value = cleaned.partition(":")
        normalized_label = label.lower().strip().lstrip("0123456789. ")
        if separator and normalized_label in {"title", "summary"}:
            title = value.strip()
            in_description = False
            continue
        if separator and normalized_label == "description":
            in_description = True
            if value.strip():
                description_lines.append(value.strip())
            continue
        if in_description:
            description_lines.append(cleaned)

    if not title:
        title = _clean_ticket_text(lines[0])

    description = "\n".join(description_lines).strip() or ticket_content.strip()
    return title[:255] or "Feedback ticket", description


def _latest_assessment(state: dict) -> IncidentAssessment | None:
    assessment = state.get("incident_assessment")
    if isinstance(assessment, list):
        return assessment[-1] if assessment else None
    return assessment


class TriageWorkflow:
    def __init__(
        self, chat_model: Any, judge_max_iterations: int = 0, checkpointer=None, graph_config: dict = {}
    ):
        self.chat_model = chat_model
        self.judge_max_iterations: int = judge_max_iterations
        self._judge_current_iteration: int = 0
        self.checkpointer = checkpointer
        self.graph_config = graph_config

        self._workflow: StateGraph = None
        self._generate_workflow()

    @property
    def workflow(self):
        return self._workflow

    def _generate_workflow(self):
        workflow = StateGraph(TriageState)

        # Adding all the nodes
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
        workflow.add_edge(START, "triage_request")
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

        self._workflow = workflow.compile(checkpointer=self.checkpointer, debug=True)

    def human_ticket_assessment(self, state: TriageState) -> TriageState:

        while True:
            assessment = interrupt(
                f"Please review the ticket answer one of the following options: {', '.join([i.value for i in HumanAssessment])}"
            )
            if assessment in [i.value for i in HumanAssessment]:
                return {"human_assessment": assessment}

    def add_additional_information_to_ticket(self, state: TriageState) -> str:
        user_comment = interrupt("Please add you comment to the ticket")
        final_ticket_content = state.get("ticket_content") + f"\nUSER COMMENT:\n{user_comment}"
        return {"ticket_content": final_ticket_content, "chat_history": HumanMessage(user_comment)}

    def route_human_assessment(self, state: TriageState) -> str:
        return state.get("human_assessment")

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
        print(state.get("chat_history"))
        only_user_interactions = [i.content for i in state.get("chat_history") if isinstance(i, HumanMessage)][:3]
        incident_assessment = triage_request_chain.invoke(
            {
                "user_query": state.get("user_query"),
                "chat_history": "\n".join(only_user_interactions),
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
        ticket_content_chain = chat_template_ticket_creation | self.chat_model
        only_user_interactions = [i.content for i in state.get("chat_history") if isinstance(i, HumanMessage)][:3]
        ticket_content = ticket_content_chain.invoke(
            {
                "user_issue": state.get("incident_assessment").user_issue,
                "severity": state.get("incident_assessment").severity,
                "reason": state.get("incident_assessment").reason,
                "user_query": state.get("user_query"), 
                "chat_history": "\n".join(only_user_interactions)
                
            }
        )
        return {"ticket_content": ticket_content.content, "chat_history": ticket_content}

    def update_ticket(self, state: TriageState) -> TriageState:
        issue_id = state.get("issue_id")
        user_id = state.get("user_id")
        if not issue_id or not user_id:
            print(
                f"[triage] update_ticket skipped missing issue_id/user_id issue_id={issue_id} user_id={user_id}",
                flush=True,
            )
            return state

        summary, description = _split_ticket_content(state.get("ticket_content", ""))
        assessment = _latest_assessment(state)
        severity = getattr(assessment, "severity", None)
        priority_by_severity = {1: "Low", 2: "Medium", 3: "High"}

        db = SessionLocal()
        try:
            ticket = Ticket(
                issue_id=issue_id,
                user_id=user_id,
                summary=summary,
                description=description,
                issue_type="feedback",
                priority=priority_by_severity.get(severity, "Medium"),
                team=_enum_value(getattr(assessment, "support_team", "support")),
                status=TICKET_STATUS_NEW,
                labels=[f"severity_{severity}"] if severity else [],
                recommended_action=getattr(assessment, "recommended_action", ""),
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)
            print(f"[triage] update_ticket saved ticket_id={ticket.id}", flush=True)
            return {"ticket_id": ticket.id}
        finally:
            db.close()

    def generate_ticket_created_response(self, state: TriageState):
        prefix = "Your comment is duly noted. " if state.get("human_assessment") == HumanAssessment.ADD_ADDITIONAL_CONTENT.value else ""
        return {
            "final_user_response": f"{prefix}Ticket with id {state.get('ticket_id')} was successfully created!"
        }

    def run(self, user_query: str, rag_results: list = [], stream: bool = False):
        if stream:
            for chunk in self._workflow.stream(
                {
                    "issue_id": "",
                    "user_id": "",
                    "user_query": user_query,
                    "rag_results": rag_results,
                },
                config=self.graph_config
            ):
                print(chunk)
        else:
            final_result = self._workflow.invoke(
                {
                    "issue_id": "",
                    "user_id": "",
                    "user_query": user_query,
                    "rag_results": rag_results,
                },
                config=self.graph_config,
            )
            return final_result
