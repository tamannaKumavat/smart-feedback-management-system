from __future__ import annotations

import json
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from langgraph.checkpoint.memory import MemorySaver
#from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import Command

from config import DATABASE_URL, MOCK_MODE
from db import SessionLocal, AsyncSessionLocal
from models.chat import AI_ANSWER_NORMAL, TICKET_STATUS_NEW, Ticket
from services import attachment_service, chat_service
from services.security import _resolve_user
from workflows.smart_feedback.workflow import build_workflow
from langchain_ollama import ChatOllama


chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0", temperature=0.1)


os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"

router = APIRouter(prefix="/ws", tags=["chat"])


@asynccontextmanager
async def _get_checkpointer():
    """Yields MemorySaver in mock mode, AsyncPostgresSaver in production."""
    
    yield MemorySaver()
    """
    else:
        async with AsyncPostgresSaver.from_conn_string(
            DATABASE_URL.replace("+psycopg", "")
        ) as cp:
            yield cp
    """

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
        #history = chat_service.list_messages(db, issue.id, user.id)
        #prior_msgs = [{"sender": m.sender, "content": m.content} for m in history]

        await websocket.accept()

        # Wait for the user's first message before touching the workflow.
        # The greeting ("How can I help you today?") is shown statically on the frontend.
        # raw = await websocket.receive_text()
        #first_msg = json.loads(raw)
        #user_content = first_msg.get("content", "")
        #attachment_ids = first_msg.get("attachmentIds", [])

        #if not user_content:
        #    await websocket.close()
        #    return

        # Save first user message to DB
        #user_msg = chat_service.record_user_message(db, issue, user_content)
        #if attachment_ids:
        #    attachment_service.link_attachments_to_message(
        #        db, message=user_msg, attachment_ids=attachment_ids, user_id=user.id
        #    )
        #    db.refresh(user_msg)
        #await websocket.send_text(json.dumps({
        #    "type": "user_message_saved",
        #    "message": _message_dto(user_msg),
        #}))
        initial_state = {
            "user_query": "",
            "prior_history": "",
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
            "ticket_content": "",
            "final_user_response": "",
        }
        # Inject first message into initial state so the workflow uses it directly
        # initial_state["user_query"] = user_content
        if (chat_id):
            new_thread_id = chat_id
        else:
            new_thread_id = issue.id
        config = {"configurable": {"thread_id": new_thread_id}}
        should_run = True
        user_input = None

        async with _get_checkpointer() as checkpointer:
            workflow = build_workflow(checkpointer=checkpointer, graph_config=config, chat_model_input=chat_model)
            while should_run:
                if user_input: 
                    graph_input = user_input
                else:
                    graph_input = initial_state

                async for chunk in workflow.workflow.astream(
                    graph_input,
                    config=config,
                    version="v2",
                    debug=True
                    ):
                        if "__interrupt__" in chunk.get("data", {}):
                            # Send interrupt signal to enable user input on client
                            await websocket.send_text(json.dumps({
                                "type": "interrupt",
                                "token": str(chunk["data"]["__interrupt__"][-1].value),
                            }))
                            
                            # Wait for user response
                            user_response = await websocket.receive_text()
                            user_input = Command(resume=user_response)
                        elif "end_node" in chunk.get("data", {}):
                            # Send final message
                            await websocket.send_text(json.dumps({
                                "type": "message",
                                "token": str(chunk["data"])
                            }))
                            should_run = False
                        elif "engagement_with_user" in chunk.get("data", {}):
                            await websocket.send_text(json.dumps({
                                "type": "message",
                                "token": str(chunk["data"]["engagement_with_user"]["engagement_response"]),
                                "token_type": chunk["type"]
                            }))
                        elif "formulate_ticket_content" in chunk.get("data", {}):
                            await websocket.send_text(json.dumps({
                                "type": "message",
                                "token": str(chunk["data"]["formulate_ticket_content"]["ticket_summary"]),
                                "token_type": chunk["type"]
                            }))
                        else:
                            #await websocket.send_text(json.dumps({
                            #    "type": "message",
                            #    "token": str(chunk["data"]),
                            #    "token_type": chunk["type"]
                            #}))
                            pass

                if "end_node" in chunk.get("data", {}):
                    should_run = False      
            

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
        await websocket.close()