from dotenv import load_dotenv
from pathlib import Path
import os

# Load from root .env first, then fall back to backend/.env if present
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv()

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://eu-de.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")
WATSONX_EMBEDDING_MODEL_ID = os.getenv("WATSONX_EMBEDDING_MODEL_ID", "ibm/granite-embedding-278m-multilingual")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
