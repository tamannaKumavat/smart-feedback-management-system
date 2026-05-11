"""File-upload handling for issue attachments in Supabase Storage.

Storage key layout::

    <user_id>/<issue_id>/<attachment_id>_<safe_filename>

The ``storage_path`` column stores this object key.
"""

from __future__ import annotations

import os
import re

from fastapi import UploadFile
from supabase import Client, create_client
from sqlalchemy.orm import Session

from config import ALLOWED_UPLOAD_MIME_PREFIXES, MAX_UPLOAD_BYTES, UPLOAD_DIR
from models.chat import Attachment, Issue, Message


class AttachmentError(Exception):
    def __init__(self, message: str, http_status: int = 400) -> None:
        super().__init__(message)
        self.http_status = http_status


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(raw: str) -> str:
    """Strip path components and collapse unsafe characters."""
    base = os.path.basename(raw or "file")
    # Defensive: also strip backslashes and any leading dots so the name
    # can't escape the destination directory or hide as a dotfile.
    base = base.replace("\\", "_").lstrip(".")
    cleaned = _SAFE_NAME_RE.sub("_", base) or "file"
    return cleaned[:120]


def _allowed_mime(mime: str | None) -> bool:
    if not mime:
        return False
    return any(mime.startswith(prefix) for prefix in ALLOWED_UPLOAD_MIME_PREFIXES)


def _supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise AttachmentError(
            "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            http_status=500,
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def save_upload(
    db: Session, *, chat: Issue, user_id: str, upload: UploadFile
) -> Attachment:
    """Persist an uploaded file to disk and create the DB row.

    The caller has already enforced issue ownership.
    """
    if not _allowed_mime(upload.content_type):
        raise AttachmentError(
            f"Unsupported file type: {upload.content_type or 'unknown'}"
        )

    safe_name = _safe_filename(upload.filename or "file")

    attachment = Attachment(
        issue_id=chat.id,
        user_id=user_id,
        filename=upload.filename or safe_name,
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=0,
        storage_path="",
    )
    db.add(attachment)
    db.flush()  # populates attachment.id without committing yet

    object_key = f"{user_id}/{chat.id}/{attachment.id}_{safe_name}"

    total = 0
    try:
        chunks: list[bytes] = []
        while True:
            chunk = upload.file.read(64 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                db.rollback()
                raise AttachmentError(
                    f"File exceeds maximum size of {MAX_UPLOAD_BYTES} bytes",
                    http_status=413,
                )
            chunks.append(chunk)
    finally:
        upload.file.close()

    payload = b"".join(chunks)
    content_type = upload.content_type or "application/octet-stream"
    supabase = _supabase_client()
    try:
        supabase.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
            path=object_key,
            file=payload,
            file_options={"content-type": content_type},
        )
    except Exception as exc:
        db.rollback()
        raise AttachmentError(f"Upload to Supabase failed: {exc}", http_status=502) from exc

    attachment.size_bytes = total
    attachment.storage_path = object_key
    db.commit()
    db.refresh(attachment)
    return attachment


def link_attachments_to_message(
    db: Session, *, message: Message, attachment_ids: list[str], user_id: str
) -> list[Attachment]:
    """Associate previously-uploaded attachments with a message.

    Only attachments belonging to the same user and chat (and not yet
    linked to a different message) are accepted; the rest are silently
    skipped to avoid leaking ownership info.
    """
    if not attachment_ids:
        return []
    linked: list[Attachment] = []
    for aid in attachment_ids:
        att = db.get(Attachment, aid)
        if att is None:
            continue
        if att.user_id != user_id or att.issue_id != message.issue_id:
            continue
        if att.message_id and att.message_id != message.id:
            continue
        att.message_id = message.id
        linked.append(att)
    if linked:
        db.commit()
    return linked


def get_user_attachment(
    db: Session, attachment_id: str, user_id: str
) -> Attachment | None:
    att = db.get(Attachment, attachment_id)
    if att is None or att.user_id != user_id:
        return None
    return att


def signed_download_url(attachment: Attachment) -> str:
    """Create a short-lived signed URL for a private storage object."""
    supabase = _supabase_client()
    try:
        data = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).create_signed_url(
            path=attachment.storage_path,
            expires_in=SUPABASE_SIGNED_URL_TTL_SECONDS,
        )
    except Exception as exc:
        raise AttachmentError(
            f"Could not create signed download URL: {exc}", http_status=502
        ) from exc

    url = data.get("signedURL") or data.get("signedUrl")
    if not url:
        raise AttachmentError("Signed URL missing in Supabase response", http_status=502)
    return url
