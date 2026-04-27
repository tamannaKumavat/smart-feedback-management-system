# RUAG Smart Feedback Management System

A minimal feedback management system with a FastAPI backend, React frontend and a PostgreSQL database, powered by IBM WatsonX AI.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (for the PostgreSQL container)

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

- `DATABASE_URL` — PostgreSQL connection string (default points at the Docker container on `localhost:5433`).
- `JWT_SECRET` — set this to a long random string. Used to sign login/signup access tokens.
- `JWT_EXPIRES_MINUTES` — access-token lifetime (default `60`).
- `WATSONX_*` — IBM WatsonX credentials. Leave `MOCK_MODE=true` to run without a real WatsonX connection.

## Database (PostgreSQL via Docker)

Postgres runs as a Docker container defined in `docker-compose.yml`. Default credentials (development only): user `sfms`, password `sfms`, database `sfms`, host port `5433`.

**Start the database**

```bash
docker compose up -d
```

Verify it is healthy:

```bash
docker exec sfms-postgres pg_isready -U sfms -d sfms
```

**Create the schema (one-time, idempotent)**

```bash
cd backend
.venv/bin/python init_db.py
```

This creates the `users` table. It does **not** insert any seed users — the table starts empty. Re-running is safe; existing data is left untouched.

**Inspect the data**

Open a `psql` shell inside the container:

```bash
docker exec -it sfms-postgres psql -U sfms -d sfms
```

Common commands:

```sql
\dt                                  -- list tables
\d users                             -- describe users table
SELECT id, full_name, email, role FROM users;
```

You can also connect any GUI client (TablePlus, DBeaver, pgAdmin) with `localhost:5433`, user `sfms`, password `sfms`, database `sfms`.

**Stop / reset**

```bash
docker compose stop          # stop, keep data
docker compose down          # remove container, keep data
docker compose down -v       # ALSO wipe the volume (then re-run init_db.py)
```

## Run

Make sure the database container is up first (`docker compose up -d`).

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

```bash
docker exec -it sfms-postgres psql -U sfms -d sfms \
  -c "UPDATE users SET role='admin' WHERE email='your-email@example.com';"
```

## MOCK_MODE

When `MOCK_MODE=true` (the default), all WatsonX calls return a hardcoded mock response. No API key required. Set `MOCK_MODE=false` and provide real credentials to use IBM WatsonX.
