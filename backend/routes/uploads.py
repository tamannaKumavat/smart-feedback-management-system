"""Endpoints for chat attachment upload + download."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from db import get_db
from models.user import User
from services import attachment_service, chat_service
from services.attachment_service import AttachmentError
from services.chat_service import ChatError
from services.security import get_current_user, get_current_user_with_query_token

router = APIRouter(prefix="/api", tags=["uploads"])


def _attachment_dto(att) -> dict:
    return {
        "id": att.id,
        "chatId": att.chat_id,
        "messageId": att.message_id,
        "filename": att.filename,
        "mimeType": att.mime_type,
        "sizeBytes": att.size_bytes,
        "url": f"/api/uploads/{att.id}",
        "createdAt": att.created_at.isoformat() if att.created_at else None,
    }


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
def upload_attachment(
    chatId: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file/screenshot for a chat.

    Two-step flow:

    1. Client uploads the file to this endpoint and receives an
       attachment ``id``.
    2. Client calls ``POST /api/messages`` and includes that ``id`` in
       ``attachmentIds`` to associate the file with the user message.

    Files left unlinked (e.g. user picks a file then cancels) remain on
    disk but are not visible from any chat. They can be cleaned up by
    a background job; we don't auto-delete here so the UX is forgiving.
    """
    try:
        chat = chat_service.get_chat_for_user(db, chatId, current_user.id)
    except ChatError as e:
        raise HTTPException(status_code=e.http_status, detail=str(e)) from e

    if chat.status == "closed":
        raise HTTPException(status_code=409, detail="Chat is closed")

    try:
        att = attachment_service.save_upload(
            db, chat=chat, user_id=current_user.id, upload=file
        )
    except AttachmentError as e:
        raise HTTPException(status_code=e.http_status, detail=str(e)) from e

    return {"ok": True, "attachment": _attachment_dto(att)}


@router.get("/uploads/{attachment_id}")
def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_query_token),
):
    att = attachment_service.get_user_attachment(db, attachment_id, current_user.id)
    if att is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    abs_path = attachment_service.absolute_path(att)
    if not abs_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        path=str(abs_path),
        media_type=att.mime_type,
        filename=att.filename,
    )
