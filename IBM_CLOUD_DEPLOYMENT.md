# IBM Cloud Code Engine Deployment Guide
## Project: Smart Feedback Management System (SFMS)
## Group: group20 | Region: Frankfurt (eu-de)

---

## What We Deployed
A FastAPI backend (`backend/`) to IBM Cloud Code Engine using a Docker image pushed to IBM Container Registry (ICR).

---

## Prerequisites
- IBM Cloud account (linked to course: IBM PoC - RUAG - watsonx Challenge 2026)
- IBM Cloud CLI installed: https://cloud.ibm.com/docs/cli
- Docker Desktop installed and running
- Access to GitHub repo: https://github.com/tamannaKumavat/smart-feedback-management-system

---

## Step 1 — Create the Dockerfile
We created `backend/Dockerfile` with the following content:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why:**
- `python:3.11-slim` is lightweight
- `COPY requirements.txt` first so Docker caches the pip install layer (faster rebuilds)
- `--host 0.0.0.0` is required so the container accepts external traffic
- Port 8000 is what FastAPI/uvicorn uses by default

---

## Step 2 — Fix requirements.txt
The original `requirements.txt` had duplicate packages (some with versions, some without), causing pip dependency conflicts during the Docker build.

**Fix:** Remove all unversioned duplicates and keep only the pinned versions.

---

## Step 3 — Install IBM Cloud CLI and Plugins

```bash
# Check CLI is installed
ibmcloud --version

# Install required plugins
ibmcloud plugin install container-registry
ibmcloud plugin install code-engine
```

---

## Step 4 — Login to IBM Cloud

```bash
ibmcloud login --sso
```
- Opens a browser URL
- Log in with your university credentials
- Copy the one-time passcode and paste it in the terminal

**Why SSO:** ETH/UZH accounts use federated login — regular username/password doesn't work.

---

## Step 5 — Target the Right Region and Resource Group

```bash
ibmcloud target -r eu-de -g group20
```

- `-r eu-de` = Frankfurt region
- `-g group20` = your assigned resource group

---

## Step 6 — Set Up Container Registry

```bash
# Set registry to Frankfurt
ibmcloud cr region-set eu-de

# Log in to registry
ibmcloud cr login
```

**Note:** The namespace `group20` was already created by the admin. We used it directly.

---

## Step 7 — Create a Registry Secret in Code Engine

This allows Code Engine to pull your image from the private registry.

```bash
# First select the Code Engine project
ibmcloud ce project select --name group20

# Create registry secret (use your IBM Cloud API key as password)
ibmcloud ce registry create --name group20-registry-secret --server de.icr.io --username iamapikey --password YOUR_IBM_CLOUD_API_KEY
```

**How to get your API key:**
1. Go to cloud.ibm.com
2. Manage → Access (IAM) → API keys
3. Click "Create an IBM Cloud API key"
4. Copy it immediately — shown only once

---

## Step 8 — Build the Docker Image Locally

```bash
# Navigate to project root
cd "e:\dev\tammy\dev\spring_2026\ibm_watsonx\latest\julian-fixes\smart-feedback-management-system"

# Build the image
docker build -t de.icr.io/group20/sfms-backend:latest ./backend
```

**Why `./backend`:** The Dockerfile is inside the `backend` folder, so we point Docker there.

---

## Step 9 — Push the Image to IBM Container Registry

```bash
docker push de.icr.io/group20/sfms-backend:latest
```

This uploads the built image to IBM's private registry so Code Engine can pull it.

---

## Step 10 — Deploy to Code Engine

```bash
ibmcloud ce application create --name sfms-backend --image de.icr.io/group20/sfms-backend:latest --registry-secret group20-registry-secret --port 8000
```

**Why not deploy from GitHub source directly:**
Code Engine's build-from-source feature requires it to push the built image to the registry using its own service account. Our course account didn't have permission to grant that. Workaround: build locally and push manually.

---

## Step 11 — Check Deployment Status

```bash
ibmcloud ce application get --name sfms-backend
```

Wait until **Status = Ready**. First deployment takes 5-10 minutes.

---

## Step 12 — Set Environment Variables

```bash
ibmcloud ce secret create --name sfms-env \
  --from-literal DATABASE_URL="your-database-url" \
  --from-literal JWT_SECRET="your-jwt-secret" \
  --from-literal WATSONX_API_KEY="your-key" \
  --from-literal WATSONX_PROJECT_ID="your-id" \
  --from-literal SUPABASE_URL="your-supabase-url" \
  --from-literal SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

ibmcloud ce application update --name sfms-backend --env-from-secret sfms-env
```

---

## Redeploying After Code Changes

Every time you change the code:

```bash
cd "e:\dev\tammy\dev\spring_2026\ibm_watsonx\latest\julian-fixes\smart-feedback-management-system"
docker build -t de.icr.io/group20/sfms-backend:latest ./backend
docker push de.icr.io/group20/sfms-backend:latest
ibmcloud ce application update --name sfms-backend --image de.icr.io/group20/sfms-backend:latest
```

---

## Key Concepts (for beginners)

| Term | What it means |
|------|--------------|
| Docker image | A packaged snapshot of your app and all its dependencies |
| Container Registry (ICR) | IBM's private storage for Docker images (like a private Docker Hub) |
| Code Engine | IBM's platform to run containers without managing servers |
| Registry secret | Credentials that allow Code Engine to pull your private image |
| Resource group | A logical grouping of IBM Cloud resources (yours is `group20`) |
| eu-de | Frankfurt, Germany — the IBM Cloud region assigned to your group |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `not authorized to access IBM Container Registry` | Missing permissions | Ask TA to grant registry access to Code Engine project |
| `This action is forbidden` for app create | Missing Code Engine permissions | Check `ibmcloud iam access-group-policies group20` |
| `no such file or directory` for Dockerfile | Wrong working directory | `cd` to project root first |
| `ResolutionImpossible` during pip install | Duplicate packages in requirements.txt | Remove unversioned duplicates |
| `ibmcloud not recognized` | CLI not installed | Install from cloud.ibm.com/docs/cli |
