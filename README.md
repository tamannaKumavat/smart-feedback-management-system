# RUAG Smart Feedback Management System

A minimal feedback management system with a FastAPI backend, React frontend and a Supabase PostgreSQL database, powered by IBM WatsonX AI.

## Prerequisites

- Python 3.11+
- Node.js 18+

## Install

**Backend**

A virtual environment keeps project dependencies isolated from your system Python.

```bash
cd backend

# Create the virtual environment (one-time setup)
python -m venv .venv

# Activate it
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Git Bash / WSL):
source .venv/Scripts/activate

# Install dependencies into the venv
pip install -r requirements.txt
```

> The `.venv/` folder is git-ignored. Re-activate it each time you open a new terminal before running the backend.

**Frontend**

```bash
cd frontend
npm install
```

## Configure

Backend environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL` — Supabase PostgreSQL connection string.
- `JWT_SECRET` — set this to a long random string. Used to sign login/signup access tokens.
- `JWT_EXPIRES_MINUTES` — access-token lifetime (default `60`).
- `WATSONX_*` — IBM WatsonX credentials. Leave `MOCK_MODE=true` to run without a real WatsonX connection.
- `JIRA_*` — Jira Cloud credentials and project settings for syncing `backend/data/jira_ticket_dataset.json` into Jira.

## Database (Supabase PostgreSQL)

Set `DATABASE_URL` in `backend/.env` to your Supabase Postgres connection string.

**Create the schema (one-time, idempotent)**

```bash
cd backend
.venv/bin/python init_db.py
```

This creates the tables required by the backend. Re-running is safe; existing data is left untouched.

## Run

**Option 1 — single script**

```bash
bash scripts/run_dev.sh
```

**Option 2 — manually**

```bash
# Terminal 1
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## MOCK_MODE

When `MOCK_MODE=true` (the default), all WatsonX calls return a hardcoded mock response. No API key required. Set `MOCK_MODE=false` and provide real credentials to use IBM WatsonX.

## Jira ticket dataset sync

The backend can create Jira issues from `backend/data/jira_ticket_dataset.json` and write Jira updates back into that file.

Configure these values in `backend/.env`:

```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=ABC
JIRA_DEFAULT_ISSUE_TYPE=Task
JIRA_WEBHOOK_SECRET=choose-a-shared-secret
JIRA_FIELD_SOURCE_CASE_ID=customfield_10000
JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID=customfield_10072
JIRA_FIELD_TEAM_ID=customfield_10001
JIRA_FIELD_RECOMMENDED_ACTION_ID=customfield_10003
JIRA_FIELD_SEVERITY_ID=customfield_10141
JIRA_FIELD_URGENCY_ID=customfield_10142
JIRA_TEAM_ID_SUPPORT=your-support-team-id
JIRA_TEAM_ID_SOFTWARE_DEVELOPMENT=your-software-development-team-id
JIRA_TEAM_ID_SECURITY=your-security-team-id
```

Start the backend, then call:

```bash
curl -X POST http://127.0.0.1:8000/api/jira/sync-to-jira
curl -X POST http://127.0.0.1:8000/api/jira/sync-from-jira
```

`sync-to-jira` creates Jira issues for dataset rows that do not yet have `jira_key` or `jira_id`, then stores the Jira identifiers in the JSON file. `sync-from-jira` refreshes linked rows from Jira.

To map dataset metadata into Jira fields, create custom fields in Jira for source case, feedback issue type, recommended action, severity, and urgency. Severity, urgency, and feedback issue type should be single-select dropdown fields. For team routing, use Jira's built-in Atlassian Team field and configure `JIRA_FIELD_TEAM_ID` with that field ID. Then find the `customfield_...` IDs with:

```bash
curl http://127.0.0.1:8000/api/jira/fields
```

Put the matching IDs in `backend/.env`. If these values are blank, the sync only uses Jira's standard fields.

Jira's Atlassian Team field expects a Team ID, not the team display name. To find a team's ID, open the team profile page in Jira/Atlassian and copy the final URL segment after `/team/`, then put it in the matching `JIRA_TEAM_ID_*` variable.

For automatic updates, configure a Jira webhook that points to:

```text
POST http://your-public-backend-url/api/jira/webhook
Secret: choose-a-shared-secret
```

When running locally, expose the backend with ngrok while the backend is
running on port 8000:

```bash
ngrok http 8000
```

Use the forwarding URL from ngrok as the Jira webhook URL:

```text
https://your-ngrok-url.ngrok-free.dev/api/jira/webhook
```
