from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import Command

from config import DATABASE_URL, MOCK_MODE
from db import SessionLocal
from models.chat import AI_ANSWER_NORMAL
from services import attachment_service, chat_service
from services.security import _resolve_user
from workflows.smart_feedback.workflow import build_workflow
from langchain_ollama import ChatOllama

# chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0", temperature=0.1)
# chat_model = ChatOllama(model="qwen2.5-coder:3b", temperature=0.1)


os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"

router = APIRouter(prefix="/ws", tags=["chat"])


@asynccontextmanager
async def _get_checkpointer():
    """Yields MemorySaver in mock mode, AsyncPostgresSaver in production."""
    if MOCK_MODE:
        yield MemorySaver()

    else:
        async with AsyncPostgresSaver.from_conn_string(
            DATABASE_URL.replace("+psycopg", "")
        ) as cp:
            yield cp


def _message_dto(msg) -> dict:
    attachments = [
        {
            "id": att.id,
            "filename": att.filename,
            "mimeType": att.mime_type,
            "sizeBytes": att.size_bytes,
            "url": f"/api/uploads/{att.id}",
        }
        for att in (getattr(msg, "attachments", None) or [])
    ]
    return {
        "id": msg.id,
        "issueId": msg.issue_id,
        "sender": msg.sender,
        "content": msg.content,
        "aiAnswerType": msg.ai_answer_type,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "attachments": attachments,
    }


@router.websocket("/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
    chat_id: str | None = Query(default=None),
):
    db = SessionLocal()
    try:
        # Authenticate
        try:
            user = _resolve_user(token, db)
        except Exception:
            await websocket.close(code=4001)
            return

        # Load or create Issue
        try:
            if chat_id:
                issue = chat_service.get_chat_for_user(db, chat_id, user.id)
                # Auto-resume if the issue is still draft (race between
                # markChatAsDraft cleanup and WS reconnect, or slow HTTP resume)
                from models.chat import ISSUE_STATUS_DRAFT, ISSUE_STATUS_CLOSED

                if issue.status == ISSUE_STATUS_CLOSED:
                    await websocket.close(code=4003)
                    return
                if issue.status == ISSUE_STATUS_DRAFT:
                    issue = chat_service.resume_draft(db, chat_id, user.id)
            else:
                issue = chat_service.create_chat(db, user.id)
        except Exception:
            await websocket.close(code=4003)
            return

        # Build prior history for the workflow
        history = chat_service.list_messages(db, issue.id, user.id)
        prior_msgs = [{"sender": m.sender, "content": m.content} for m in history]
        await websocket.accept()
        if prior_msgs:
            initial_state = None  # If we want to continue the graph from the specific state, we need to pass the initial state as None. Only than it can continue!
        else:
            initial_state = {
                "issue_id": issue.id,
                "user_id": user.id,
                "user_query": "",
                "prior_history": prior_msgs,
                "chat_history": [],
                "is_first_message": True,
                "needs_clarification": False,
                "human_assessment": "",
                "ticket_id": "",
                "analysis_agent_result": None,
                "rag_results": [],
                "rag_user_assessment": "",
                "rag_workflow_state": {},
                "triage_workflow": {},
                "engagement_response": "",
                "ready_to_create_ticket": False,
                "ticket_summary": "",
                "ticket_content": "",
                "jira_ticket": {},
                "final_user_response": "",
            }

        new_thread_id = chat_id if chat_id else issue.id
        config = {"configurable": {"thread_id": new_thread_id}}
        should_run = True
        user_input = None

        async with _get_checkpointer() as checkpointer:
            workflow = build_workflow(
                checkpointer=checkpointer,
                graph_config=config,
                # chat_model_input=chat_model,
                db=db,
                issue=issue,
                user_id=user.id,
            )
            while should_run:
                graph_input = user_input if user_input else initial_state

                async for chunk in workflow.workflow.astream(
                    graph_input,
                    config=config,
                    version="v2",
                    debug=True,
                ):
                    if "__interrupt__" in chunk.get("data", {}):
                        interrupt_val = chunk["data"]["__interrupt__"][-1].value
                        if isinstance(interrupt_val, dict):
                            interrupt_content = interrupt_val.get("content", "")
                            interrupt_options = interrupt_val.get("options", [])
                        else:
                            interrupt_content = str(interrupt_val)
                            interrupt_options = []
                        if interrupt_content:
                            chat_service.record_ai_message(
                                db, issue, interrupt_content, AI_ANSWER_NORMAL
                            )
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "options",
                                    "content": interrupt_content,
                                    "options": interrupt_options,
                                }
                            )
                        )

                        raw_response = await websocket.receive_text()
                        try:
                            parsed = json.loads(raw_response)
                            if isinstance(parsed, dict):
                                resp_content = parsed.get("content", "") or ""
                                resp_att_ids = parsed.get("attachmentIds", []) or []
                            else:
                                resp_content = raw_response.strip()
                                resp_att_ids = []
                        except json.JSONDecodeError:
                            resp_content = raw_response.strip()
                            resp_att_ids = []
                        if resp_content:
                            resp_msg = chat_service.record_user_message(
                                db, issue, resp_content
                            )
                            if resp_att_ids:
                                attachment_service.link_attachments_to_message(
                                    db,
                                    message=resp_msg,
                                    attachment_ids=resp_att_ids,
                                    user_id=user.id,
                                )
                        user_input = Command(resume=resp_content)

                    elif "end_node" in chunk.get("data", {}):
                        summary = chunk["data"]["end_node"].get(
                            "final_user_response", ""
                        )
                        chat_service.close_issue(db, issue, summary=summary or None)
                        should_run = False

                    elif "engagement_with_user" in chunk.get("data", {}):
                        node_data = chunk["data"]["engagement_with_user"]
                        # Skip when needs_clarification=True: the question will surface
                        # via the next interrupt instead of being shown twice.
                        if node_data.get("needs_clarification") is not True:
                            ai_content = str(
                                node_data.get("engagement_response") or ""
                            ).strip()
                            if ai_content:
                                chat_service.record_ai_message(
                                    db, issue, ai_content, AI_ANSWER_NORMAL
                                )
                                await websocket.send_text(
                                    json.dumps(
                                        {
                                            "type": "message",
                                            "content": ai_content,
                                        }
                                    )
                                )

                    elif "formulate_ticket_content" in chunk.get("data", {}):
                        ticket_content = str(
                            chunk["data"]["formulate_ticket_content"].get(
                                "ticket_summary"
                            )
                            or ""
                        ).strip()
                        if ticket_content:
                            chat_service.record_ai_message(
                                db, issue, ticket_content, AI_ANSWER_NORMAL
                            )
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "message",
                                        "content": ticket_content,
                                    }
                                )
                            )

                    elif "generate_ticket_created_response" in chunk.get("data", {}):
                        confirmation = (
                            chunk["data"]["generate_ticket_created_response"]
                            .get("final_user_response", "")
                            .strip()
                        )
                        if confirmation:
                            chat_service.record_ai_message(
                                db, issue, confirmation, AI_ANSWER_NORMAL
                            )
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "message",
                                        "content": confirmation,
                                    }
                                )
                            )

                if "end_node" in chunk.get("data", {}):
                    should_run = False

    except WebSocketDisconnect:
        print("[ws] Client disconnected")
    except Exception:
        import traceback

        traceback.print_exc()
    finally:
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass
