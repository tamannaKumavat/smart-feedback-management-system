from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from langgraph.types import Command
from workflows.smart_feedback.workflow import build_workflow
import uuid
import json
from datetime import datetime
from config import DATABASE_URL, MOCK_MODE
import os

os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"

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

    """ 
    if MOCK_MODE:
        checkpointer = MemorySaver() # We save the chat history currently just in the memory
    """
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    should_run: bool = True
    user_input = None
    graph_input = None

    try:
        async with AsyncPostgresSaver.from_conn_string(DATABASE_URL.replace("+psycopg", "")) as checkpointer:
            # await checkpointer.setup() -> Use only once 
            workflow = build_workflow(checkpointer=checkpointer, graph_config=config)

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
                        # Stream tokens to the client
                        # Check if system needs user input
                        if "__interrupt__" in chunk.get("data", {}):
                            # Send interrupt signal to enable user input on client
                            await websocket.send_text(json.dumps({
                                "type": "token",
                                "token": str(chunk["data"]["__interrupt__"][-1].value),
                                "token_type": chunk["type"]
                            }))
                            await websocket.send_text(json.dumps({
                                "type": "interrupt",
                                "message": "Waiting for user input..."
                            }))
                            
                            # Wait for user response
                            user_response = await websocket.receive_text()
                            user_message = json.loads(user_response)
                            user_input = Command(resume=user_message.get("content"))
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
                        elif "engagement_with_user" in chunk.get("data", {}):
                            await websocket.send_text(json.dumps({
                                "type": "token",
                                "token": str(chunk["data"]["engagement_with_user"]["engagement_response"]) + "\n",
                                "token_type": chunk["type"]
                            }))

                        elif "formulate_ticket_content" in chunk.get("data", {}):
                            print(f"formulate ticket chunk: {chunk}")
                            await websocket.send_text(json.dumps({
                                        "type": "token",
                                        "token": str(chunk["data"]["formulate_ticket_content"]["ticket_summary"]),
                                        "token_type": chunk["type"]
                                    }))
                        else:
                            #    
                            #await websocket.send_text(json.dumps({
                            #    "type": "token",
                            #    "token": str(chunk["data"]),
                            #    "token_type": chunk["type"]
                            #}))
                            pass

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
