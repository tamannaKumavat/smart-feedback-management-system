from dotenv import load_dotenv
from pathlib import Path
import os

# Load from root .env first, then fall back to backend/.env if present
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv()

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://eu-de.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "mistralai/mistral-small-3-1-24b-instruct-2503")
WATSONX_EMBEDDING_MODEL_ID = os.getenv("WATSONX_EMBEDDING_MODEL_ID", "ibm/granite-embedding-278m-multilingual")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://sfms:sfms@localhost:5433/issues",
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

JIRA_BASE_URL = os.getenv("JIRA_BASE_URL", "").rstrip("/")
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "")
JIRA_DEFAULT_ISSUE_TYPE = os.getenv("JIRA_DEFAULT_ISSUE_TYPE", "Task")
JIRA_DEFAULT_ASSIGNEE_ACCOUNT_ID = os.getenv("JIRA_DEFAULT_ASSIGNEE_ACCOUNT_ID", "")
JIRA_WEBHOOK_SECRET = os.getenv("JIRA_WEBHOOK_SECRET", "")
JIRA_FIELD_SOURCE_CASE_ID = os.getenv("JIRA_FIELD_SOURCE_CASE_ID", "")
JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID = os.getenv("JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID", "")
JIRA_FIELD_TEAM_ID = os.getenv("JIRA_FIELD_TEAM_ID", "")
JIRA_FIELD_RECOMMENDED_ACTION_ID = os.getenv("JIRA_FIELD_RECOMMENDED_ACTION_ID", "")
