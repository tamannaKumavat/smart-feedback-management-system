import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.chats import router as chats_router
from routes.feedback import router as feedback_router
from routes.jira import router as jira_router
from routes.tickets import router as tickets_router
from routes.uploads import router as uploads_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="RUAG Smart Feedback Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chats_router)
app.include_router(uploads_router)
app.include_router(tickets_router)
app.include_router(feedback_router)
app.include_router(jira_router)


@app.get("/health")
def health():
    return {"status": "ok"}
