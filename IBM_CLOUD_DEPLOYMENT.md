# IBM Cloud Code Engine Deployment Guide
## Project: Smart Feedback Management System (SFMS)
## Group: group20 | Region: Frankfurt (eu-de)

---

## Architecture

- **Backend**: FastAPI app → Docker image → IBM Container Registry → Code Engine app (`sfms-backend`, port 8000)
- **Frontend**: React + Vite → nginx → Docker image → IBM Container Registry → Code Engine app (`sfms-frontend`, port 80)
- **Database**: Supabase (remote PostgreSQL, no deployment needed)
- nginx proxies `/api/` and `/ws/` requests from the frontend to the backend

---

## Prerequisites

- IBM Cloud account (course account: IBM PoC - RUAG - watsonx Challenge 2026)
- IBM Cloud CLI installed: https://cloud.ibm.com/docs/cli
- Docker Desktop installed and running
- Access to GitHub repo: https://github.com/tamannaKumavat/smart-feedback-management-system

---

## Step 1 — Install IBM Cloud CLI Plugins

```bash
ibmcloud plugin install container-registry
ibmcloud plugin install code-engine
```

---

## Step 2 — Login to IBM Cloud

```bash
ibmcloud login --sso
```

- Opens a browser URL
- Log in with your university credentials (UZH/ETH)
- Copy the one-time passcode and paste it in the terminal
- Select account: **IBM PoC - RUAG - watsonx Challenge 2026**

Then target your region and resource group:

```bash
ibmcloud target -r eu-de -g group20
```

---

## Step 3 — Login to Container Registry

```bash
ibmcloud cr region-set eu-de
ibmcloud cr login
```

If login expires (403 on push), re-authenticate using your IBM Cloud API key directly:

```bash
docker login de.icr.io -u iamapikey -p YOUR_IBM_CLOUD_API_KEY
```

**How to get your API key:**
1. Go to cloud.ibm.com → Manage → Access (IAM) → API keys
2. Click "Create an IBM Cloud API key"
3. **Leave expiry empty** — always create keys without expiry
4. Copy the key immediately — shown only once

---

## Step 4 — Select the Code Engine Project

```bash
ibmcloud ce project select --name group20
```

---

## Step 5 — Create a Registry Secret

This allows Code Engine to pull your Docker images from the private registry:

```bash
ibmcloud ce registry create --name group20-registry-secret \
  --server de.icr.io \
  --username iamapikey \
  --password YOUR_IBM_CLOUD_API_KEY
```

If it already exists and you need to update it (e.g. after key expiry):

```bash
ibmcloud ce registry delete --name group20-registry-secret --force
ibmcloud ce registry create --name group20-registry-secret \
  --server de.icr.io \
  --username iamapikey \
  --password YOUR_IBM_CLOUD_API_KEY
```

---

## Step 6 — Build and Push the Backend Image

Navigate to the project root first:

```bash
cd "e:\dev\tammy\dev\spring_2026\ibm_watsonx\latest\julian-fixes\smart-feedback-management-system"
```

Build:

```bash
docker build --no-cache -t de.icr.io/group20/sfms-backend:latest ./backend
```

Push:

```bash
docker push de.icr.io/group20/sfms-backend:latest
```

**Note on dependency conflict:** `ibm-watsonx-ai` and `supabase` have conflicting `httpx` version requirements. The `backend/Dockerfile` handles this by installing supabase separately with `--no-deps` and then installing its required sub-packages manually.

---

## Step 7 — Deploy the Backend

First deployment:

```bash
ibmcloud ce application create \
  --name sfms-backend \
  --image de.icr.io/group20/sfms-backend:latest \
  --registry-secret group20-registry-secret \
  --port 8000 \
  --min-scale 1
```

Subsequent deployments (after code changes):

```bash
ibmcloud ce application update \
  --name sfms-backend \
  --image de.icr.io/group20/sfms-backend:latest \
  --no-wait
```

---

## Step 8 — Set Environment Variables

Create the secret (only once):

```bash
ibmcloud ce secret create --name sfms-env \
  --from-literal DATABASE_URL="your-database-url" \
  --from-literal JWT_SECRET="your-jwt-secret" \
  --from-literal WATSONX_API_KEY="your-key" \
  --from-literal WATSONX_PROJECT_ID="your-id" \
  --from-literal WATSONX_URL="https://eu-de.ml.cloud.ibm.com" \
  --from-literal WATSONX_MODEL_ID="mistralai/mistral-small-3-1-24b-instruct-2503" \
  --from-literal WATSONX_EMBEDDING_MODEL_ID="ibm/granite-embedding-278m-multilingual" \
  --from-literal MOCK_MODE="false" \
  --from-literal JIRA_BASE_URL="your-jira-url" \
  --from-literal JIRA_EMAIL="your-jira-email" \
  --from-literal JIRA_API_TOKEN="your-jira-token" \
  --from-literal JIRA_PROJECT_KEY="KAN" \
  --from-literal JIRA_DEFAULT_ISSUE_TYPE="Task" \
  --from-literal JIRA_WEBHOOK_SECRET="your-webhook-secret" \
  --from-literal JIRA_FIELD_SOURCE_CASE_ID="customfield_10074" \
  --from-literal JIRA_FIELD_FEEDBACK_ISSUE_TYPE_ID="customfield_10072" \
  --from-literal JIRA_FIELD_TEAM_ID="customfield_10075" \
  --from-literal JIRA_FIELD_RECOMMENDED_ACTION_ID="customfield_10073"
```

Attach to the backend app:

```bash
ibmcloud ce application update --name sfms-backend --env-from-secret sfms-env --no-wait
```

---

## Step 9 — Build and Push the Frontend Image

The frontend uses nginx to proxy `/api/` and `/ws/` requests to the backend.

**Important:** Update `frontend/nginx.conf` with your actual backend URL before building:

```nginx
proxy_pass https://sfms-backend.27cm6ddk8tsg.eu-de.codeengine.appdomain.cloud;
```

Build and push:

```bash
docker build --no-cache -t de.icr.io/group20/sfms-frontend:latest ./frontend
docker push de.icr.io/group20/sfms-frontend:latest
```

---

## Step 10 — Deploy the Frontend

First deployment:

```bash
ibmcloud ce application create \
  --name sfms-frontend \
  --image de.icr.io/group20/sfms-frontend:latest \
  --registry-secret group20-registry-secret \
  --port 80
```

Subsequent deployments:

```bash
ibmcloud ce application update \
  --name sfms-frontend \
  --image de.icr.io/group20/sfms-frontend:latest \
  --no-wait
```

---

## Step 11 — Verify Deployment

Check backend status and URL:

```bash
ibmcloud ce application get --name sfms-backend
```

Check backend logs:

```bash
ibmcloud ce application logs -f -n sfms-backend
```

Test the backend directly:

```bash
curl https://sfms-backend.27cm6ddk8tsg.eu-de.codeengine.appdomain.cloud/docs
```

Open the frontend in a browser:

```
https://sfms-frontend.27cm6ddk8tsg.eu-de.codeengine.appdomain.cloud
```

---

## Redeploying After Code Changes

```bash
cd "e:\dev\tammy\dev\spring_2026\ibm_watsonx\latest\julian-fixes\smart-feedback-management-system"

# Backend
docker build --no-cache -t de.icr.io/group20/sfms-backend:latest ./backend
docker push de.icr.io/group20/sfms-backend:latest
ibmcloud ce application update --name sfms-backend --image de.icr.io/group20/sfms-backend:latest --no-wait

# Frontend
docker build --no-cache -t de.icr.io/group20/sfms-frontend:latest ./frontend
docker push de.icr.io/group20/sfms-frontend:latest
ibmcloud ce application update --name sfms-frontend --image de.icr.io/group20/sfms-frontend:latest --no-wait
```

---

## Key Concepts

| Term | What it means |
|------|--------------|
| Docker image | A packaged snapshot of your app and all its dependencies |
| Container Registry (ICR) | IBM's private storage for Docker images (`de.icr.io`) |
| Code Engine | IBM's platform to run containers without managing servers |
| Registry secret | Credentials that allow Code Engine to pull your private image |
| Resource group | A logical grouping of IBM Cloud resources (yours is `group20`) |
| eu-de | Frankfurt, Germany — the IBM Cloud region assigned to your group |
| nginx | Web server used to serve the React app and proxy API requests to the backend |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `403 Forbidden` on docker push | Registry credentials expired or wrong | Re-run `ibmcloud cr login` or `docker login de.icr.io -u iamapikey -p KEY` |
| `UNAUTHORIZED` on Code Engine deploy | Registry secret has expired API key | Delete and recreate `group20-registry-secret` with new API key |
| `ModuleNotFoundError: No module named 'postgrest'` | Supabase installed with `--no-deps` but sub-packages missing | Check `backend/Dockerfile` has all supabase sub-packages listed |
| `uvicorn not found in PATH` | pip install failed silently | Never pipe `pip install` output — always run it directly |
| `502 Bad Gateway` on frontend | nginx can't reach backend | Check `proxy_ssl_server_name on` is set in `nginx.conf` |
| `404` on frontend API calls | nginx URI rewriting issue | Use `proxy_pass` without trailing path so full URI is forwarded |
| `ibmcloud not recognized` | CLI not installed | Install from cloud.ibm.com/docs/cli |
| API key expires immediately | Created with wrong expiry | Always leave expiry field empty when creating API keys |
| `This action is forbidden` on CE | Missing Code Engine permissions | Check `ibmcloud iam access-group-policies group20` |
