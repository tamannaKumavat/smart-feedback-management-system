from dotenv import load_dotenv
from pathlib import Path
import os

# Load env files deterministically:
# 1) repo root .env (if present)
# 2) backend/.env (this project keeps runtime values here)
# 3) ambient env from process (already exported variables still win)
_HERE = Path(__file__).resolve().parent
_ROOT_ENV = _HERE.parent / ".env"
_BACKEND_ENV = _HERE / ".env"

load_dotenv(_ROOT_ENV, override=False)
load_dotenv(_BACKEND_ENV, override=False)

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://eu-de.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "mistralai/mistral-small-3-1-24b-instruct-2503")
WATSONX_EMBEDDING_MODEL_ID = os.getenv("WATSONX_EMBEDDING_MODEL_ID", "ibm/granite-embedding-278m-multilingual")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
RAG_RELEVANCE_THRESHOLD = float(os.getenv("RAG_RELEVANCE_THRESHOLD", "0.75"))
RAG_KEYWORD_FALLBACK_SCORE = float(os.getenv("RAG_KEYWORD_FALLBACK_SCORE", "0.35"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres",
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

# Supabase Storage (private bucket + signed URLs).
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "attachments")
SUPABASE_SIGNED_URL_TTL_SECONDS = int(
    os.getenv("SUPABASE_SIGNED_URL_TTL_SECONDS", "120")
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
