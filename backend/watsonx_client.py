import logging
from config import WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL, WATSONX_MODEL_ID, MOCK_MODE

logger = logging.getLogger(__name__)


class WatsonXClient:
    def __init__(self):
        self.mock_mode = MOCK_MODE
        self.model = None

        if not self.mock_mode:
            try:
                from ibm_watsonx_ai import Credentials
                from ibm_watsonx_ai.foundation_models import ModelInference

                credentials = Credentials(
                    url=WATSONX_URL,
                    api_key=WATSONX_API_KEY,
                )
                self.model = ModelInference(
                    model_id=WATSONX_MODEL_ID,
                    credentials=credentials,
                    project_id=WATSONX_PROJECT_ID,
                )
                logger.info("WatsonX client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize WatsonX client: {e}")
                self.model = None
        else:
            logger.info("WatsonX client running in MOCK_MODE.")

    def generate(self, prompt: str) -> str:
        if self.mock_mode:
            snippet = prompt[:50].replace("\n", " ")
            return f"[MOCK] This is a mock watsonx response for: {snippet}..."

        if self.model is None:
            return "Error: WatsonX client is not initialized."

        try:
            response = self.model.generate_text(prompt=prompt)
            return response
        except Exception as e:
            logger.error(f"WatsonX generate error: {e}")
            return f"Error: {str(e)}"


watsonx_client = WatsonXClient()
