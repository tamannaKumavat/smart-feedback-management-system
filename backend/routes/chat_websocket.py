from langgraph.checkpoint.memory import MemorySaver
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from langgraph.types import Command
from langchain_ollama import ChatOllama
from workflows.smart_feedback.workflow import SmartFeedbackWorkflow
import uuid 



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
    chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0")
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    await websocket.accept()
    # Thread-safe SQLite
    checkpointer = MemorySaver()
    
    workflow = SmartFeedbackWorkflow(chat_model, checkpointer=checkpointer, graph_config=config)
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
                await websocket.send_text(f"{chunk}")
                if chunk["type"] == "updates":
                    if "__interrupt__" in chunk["data"]:

                        response = await websocket.receive_text()
                        user_input = Command(resume=response)

            if "end_node" in chunk["data"]:
                should_run = False            

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        await websocket.close()
    await websocket.close()