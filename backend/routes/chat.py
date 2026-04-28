import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import (
    MOCK_MODE,
    WATSONX_API_KEY,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
    WATSONX_MODEL_ID,
)
from workflows.smart_feedback.workflow import SmartFeedbackWorkflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / response shapes
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    user_query: str
    is_first_message: bool = True


class ChatResponse(BaseModel):
    response: str


# ---------------------------------------------------------------------------
# Mock LLM — used when MOCK_MODE=true so the workflow runs without credentials
# ---------------------------------------------------------------------------

def _build_mock_chat_model():
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.messages import AIMessage
    from langchain_core.outputs import ChatGeneration, ChatResult
    from langchain_core.runnables import RunnableLambda

    class _MockChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            return ChatResult(
                generations=[
                    ChatGeneration(
                        message=AIMessage(
                            content=(
                                "[MOCK] Thank you for reaching out. "
                                "I have received your message and am looking into it."
                            )
                        )
                    )
                ]
            )

        def with_structured_output(self, schema, **kwargs):
            """Return a Runnable that produces a default instance of *schema*.

            Tries schema() first (works when all fields have defaults).
            Falls back to filling required enum/Literal fields with their
            first valid value so the graph can keep running in mock mode.
            """
            def build_default(_input):
                try:
                    return schema()
                except Exception:
                    init_kwargs = {}
                    for field_name, field_info in schema.model_fields.items():
                        if field_info.is_required():
                            ann = field_info.annotation
                            # Enum subclass (e.g. RAGEvaluationDecision)
                            if hasattr(ann, "__members__"):
                                init_kwargs[field_name] = list(ann)[0]
                            # Literal / Union — first arg
                            elif hasattr(ann, "__args__"):
                                init_kwargs[field_name] = ann.__args__[0]
                    return schema(**init_kwargs)

            return RunnableLambda(build_default)

        @property
        def _llm_type(self) -> str:
            return "mock"

    return _MockChatModel()


def _build_live_chat_model():
    from langchain_ibm import ChatWatsonx

    return ChatWatsonx(
        model_id=WATSONX_MODEL_ID,
        url=WATSONX_URL,
        apikey=WATSONX_API_KEY,
        project_id=WATSONX_PROJECT_ID,
        params={"max_new_tokens": 512, "temperature": 0.3},
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.user_query.strip():
        raise HTTPException(status_code=400, detail="user_query cannot be empty.")

    try:
        chat_model = _build_mock_chat_model() if MOCK_MODE else _build_live_chat_model()
        workflow = SmartFeedbackWorkflow(chat_model)
        result = workflow.run(
            user_query=request.user_query,
            is_first_message=request.is_first_message,
        )
    except Exception as exc:
        logger.exception("SmartFeedbackWorkflow failed: %s", exc)
        raise HTTPException(status_code=500, detail="Workflow execution failed.") from exc

    response_text = (result or {}).get("engagement_response") or (
        "Thank you for your feedback. We will get back to you shortly."
    )
    return ChatResponse(response=response_text)
