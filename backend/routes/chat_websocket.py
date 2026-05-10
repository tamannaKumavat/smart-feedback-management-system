from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from db import SessionLocal
from models.chat import AI_ANSWER_NORMAL, TICKET_STATUS_NEW, Ticket
from services import attachment_service, chat_service
from services.security import _resolve_user
from workflows.smart_feedback.workflow import build_workflow

router = APIRouter(prefix="/ws", tags=["chat"])


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
            else:
                issue = chat_service.create_chat(db, user.id)
        except Exception:
            await websocket.close(code=4003)
            return

        # Build prior history for the workflow
        history = chat_service.list_messages(db, issue.id, user.id)
        prior_msgs = [{"sender": m.sender, "content": m.content} for m in history]

        initial_state = {
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
            "final_user_response": "",
        }

        await websocket.accept()

        # Wait for the user's first message before touching the workflow.
        # The greeting ("How can I help you today?") is shown statically on the frontend.
        raw = await websocket.receive_text()
        first_msg = json.loads(raw)
        user_content = first_msg.get("content", "")
        attachment_ids = first_msg.get("attachmentIds", [])

        if not user_content:
            await websocket.close()
            return

        # Save first user message to DB
        user_msg = chat_service.record_user_message(db, issue, user_content)
        if attachment_ids:
            attachment_service.link_attachments_to_message(
                db, message=user_msg, attachment_ids=attachment_ids, user_id=user.id
            )
            db.refresh(user_msg)
        await websocket.send_text(json.dumps({
            "type": "user_message_saved",
            "message": _message_dto(user_msg),
        }))

        # Inject first message into initial state so the workflow uses it directly
        initial_state["user_query"] = user_content

        checkpointer = MemorySaver()
        config = {"configurable": {"thread_id": str(uuid.uuid4())}}
        workflow = build_workflow(checkpointer=checkpointer, graph_config=config)
        should_run = True
        user_input = None

        while should_run:
            graph_input = user_input if user_input else initial_state
            interrupt_value = None

            async for chunk in workflow.workflow.astream(
                graph_input,
                config=config,
                stream_mode="updates",
            ):
                if "__interrupt__" in chunk:
                    # Always take the last value — LangGraph replays the previous
                    # interrupt on resume, so earlier values get overwritten.
                    interrupt_value = chunk["__interrupt__"][-1].value
                elif "end_node" in chunk:
                    end_state = chunk["end_node"]
                    content = (
                        end_state.get("final_user_response")
                        or end_state.get("engagement_response")
                        or ""
                    )
                    if content:
                        ai_msg = chat_service.record_ai_message(
                            db, issue, content, AI_ANSWER_NORMAL
                        )
                        await websocket.send_text(json.dumps({
                            "type": "message",
                            "message": _message_dto(ai_msg),
                        }))

                    # Create ticket in DB if the triage path ran
                    ticket_content = end_state.get("ticket_content", "")
                    if ticket_content:
                        ticket = Ticket(
                            issue_id=issue.id,
                            user_id=user.id,
                            summary=ticket_content,
                            status=TICKET_STATUS_NEW,
                        )
                        db.add(ticket)
                        db.commit()

                    should_run = False

            # Handle interrupt AFTER the stream ends — never block inside the loop.
            if interrupt_value is not None and should_run:
                ai_msg = chat_service.record_ai_message(
                    db, issue, str(interrupt_value), AI_ANSWER_NORMAL
                )
                await websocket.send_text(json.dumps({
                    "type": "message",
                    "message": _message_dto(ai_msg),
                }))
                await websocket.send_text(json.dumps({
                    "type": "interrupt",
                    "message": "Waiting for user input...",
                }))

                raw = await websocket.receive_text()
                msg = json.loads(raw)
                user_content = msg.get("content", "")
                attachment_ids = msg.get("attachmentIds", [])

                # Save user message to DB
                if user_content:
                    try:
                        user_msg = chat_service.record_user_message(
                            db, issue, user_content
                        )
                        if attachment_ids:
                            attachment_service.link_attachments_to_message(
                                db,
                                message=user_msg,
                                attachment_ids=attachment_ids,
                                user_id=user.id,
                            )
                            db.refresh(user_msg)
                        await websocket.send_text(json.dumps({
                            "type": "user_message_saved",
                            "message": _message_dto(user_msg),
                        }))
                    except Exception as exc:
                        print(f"[ws] DB write failed: {exc}")

                user_input = Command(resume=user_content)

        await websocket.close()

    except WebSocketDisconnect:
        print("[ws] Client disconnected")
    except Exception as exc:
        import traceback
        traceback.print_exc()
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        db.close()
