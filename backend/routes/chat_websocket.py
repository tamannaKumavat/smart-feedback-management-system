from langgraph.checkpoint.sqlite import SqliteSaver
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from langgraph.types import Command
import sqlite3
from langchain_ollama import ChatOllama
from workflows.smart_feedback.workflow import SmartFeedbackWorkflow
import uuid 



router = APIRouter(prefix="/ws", tags=["chat"])

# Thread-safe SQLite
checkpointer = SqliteSaver(
    sqlite3.connect(":memory:", check_same_thread=False)
)


@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0")
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    await websocket.accept()

    try:
        workflow = SmartFeedbackWorkflow(chat_model, checkpointer=checkpointer)
        result = workflow.run(
            user_query="",
            is_first_message=True,
            config=config
        )

        # Handle interrupts
        while True:
            await websocket.send_text(f"{result}")

            if "__interrupt__" in result:
                # Send the interrupt message to the user
                for msg in result["__interrupt__"]:
                    await websocket.send_text(f"{result}")

                # Wait for user response
                response = await websocket.receive_text()
                result = workflow.workflow.invoke(
                    Command(resume= response),  # Resume with user input
                    config=config
                )
            else:
                # Workflow complete
                break
            

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()
    await websocket.close()