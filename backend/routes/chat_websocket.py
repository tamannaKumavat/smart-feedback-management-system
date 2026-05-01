from langgraph.checkpoint.memory import MemorySaver
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from langgraph.types import Command
from workflows.smart_feedback.workflow import build_workflow
import uuid
import json
from datetime import datetime


router = APIRouter(prefix="/ws", tags=["chat"])



@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    initial_state = {
            "user_query": "",
            "chat_history": [],
            "needs_clarification": False,
            "human_assessment": "",
            "ticket_id": "",
            "analysis_agent_result": None,
            "rag_results": [],
            "rag_workflow_state": {},
            "triage_workflow_state": {},
            "engagement_response": "",
        }

    await websocket.accept()
    
    checkpointer = MemorySaver() # We save the chat history currently just in the memory
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    workflow = build_workflow(checkpointer=checkpointer, graph_config=config)
    should_run: bool = True
    user_input = None
    graph_input = None

    try:
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

                if "type" in chunk and chunk["type"] == "updates":
                    if "__interrupt__" in chunk.get("data", {}):
                        # Ask for clarification
                        response = await websocket.receive_text()
                        user_input = Command(resume=response)
                    
                        await websocket.send_text(json.dumps({
                            "type": "token",
                            "token": str(chunk.get("data", "")),
                        }))
                    elif "end_node" in chunk.get("data", {}):
                        # Send final message
                        await websocket.send_text(json.dumps({
                            "type": "message",
                            "message": {
                                "id": str(uuid.uuid4()),
                                "sender": "ai",
                                "content": chunk["data"].get("engagement_response", ""),
                                "aiAnswerType": "normal",
                                "createdAt": datetime.utcnow().isoformat(),
                            }
                        }))
                        should_run = False
                else:
                    # Fallback: Send raw chunk as token (for debugging)
                    await websocket.send_text(json.dumps({
                        "type": "token",
                        "token": str(chunk),
                    }))
            if "end_node" in chunk.get("data", {}):
                should_run = False      
        await websocket.close()
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        await websocket.close()
