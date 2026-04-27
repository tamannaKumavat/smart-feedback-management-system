from dotenv import load_dotenv
import os

load_dotenv()

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://sfms:sfms@localhost:5433/sfms",
)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

# Local filesystem location where user-uploaded chat attachments are
# stored. Files are organised as <UPLOAD_DIR>/<user_id>/<chat_id>/<id>_<safe_name>.
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(__file__), "data", "uploads"),
)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB
ALLOWED_UPLOAD_MIME_PREFIXES = (
    "image/",
    "application/pdf",
    "text/",
)
