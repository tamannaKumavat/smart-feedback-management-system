import hashlib
import hmac
import json

from fastapi import APIRouter, Header, HTTPException, Request

from config import JIRA_WEBHOOK_SECRET
from services.jira_sync import (
    JiraClient,
    JiraApiError,
    JiraConfigError,
    apply_jira_webhook,
    load_ticket_dataset,
    sync_dataset_from_jira,
    sync_dataset_to_jira,
)

router = APIRouter(prefix="/api/jira", tags=["jira"])


def handle_jira_error(error: Exception) -> None:
    if isinstance(error, JiraConfigError):
        raise HTTPException(status_code=500, detail=str(error)) from error
    if isinstance(error, JiraApiError):
        raise HTTPException(status_code=error.status_code or 502, detail=str(error)) from error
    raise error


@router.get("/tickets")
def get_jira_ticket_dataset():
    return load_ticket_dataset()


@router.get("/fields")
def get_jira_fields():
    try:
        fields = JiraClient().list_fields()
        return [
            {
                "id": field.get("id"),
                "name": field.get("name"),
                "custom": field.get("custom"),
                "schema": field.get("schema", {}),
            }
            for field in fields
        ]
    except Exception as error:
        handle_jira_error(error)


@router.post("/sync-to-jira")
def create_dataset_tickets_in_jira():
    try:
        return sync_dataset_to_jira().as_dict()
    except Exception as error:
        handle_jira_error(error)


@router.post("/sync-from-jira")
def update_dataset_from_jira():
    try:
        return sync_dataset_from_jira().as_dict()
    except Exception as error:
        handle_jira_error(error)


@router.post("/webhook")
async def jira_webhook(
    request: Request,
    x_hub_signature: str | None = Header(default=None),
):
    body = await request.body()
    if JIRA_WEBHOOK_SECRET:
        if not x_hub_signature:
            raise HTTPException(status_code=401, detail="Missing Jira webhook signature.")

        method, _, signature = x_hub_signature.partition("=")
        digestmod = getattr(hashlib, method, None)
        if not digestmod or not signature:
            raise HTTPException(status_code=401, detail="Unsupported Jira webhook signature.")

        expected = hmac.new(
            JIRA_WEBHOOK_SECRET.encode(),
            body,
            digestmod,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail="Invalid Jira webhook signature.")

    payload = json.loads(body)
    return apply_jira_webhook(payload)
