# RUAG Smart Feedback Management System

A minimal feedback management system with a FastAPI backend and React frontend, powered by IBM WatsonX AI.

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

```bash
cp .env.example .env
```

Edit `.env` with your WatsonX credentials. Leave `MOCK_MODE=true` to run without a real WatsonX connection.

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
