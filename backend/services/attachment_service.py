"""File-upload handling for chat attachments.

Storage layout::

    <UPLOAD_DIR>/<user_id>/<chat_id>/<attachment_id>_<safe_filename>

Files are written under a per-user / per-chat tree so a single ``rm -rf``
of a user's directory cleanly removes their data. The ``storage_path``
column is the path *relative* to ``UPLOAD_DIR`` so the upload root can
move without breaking existing rows.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from fastapi import UploadFile
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


def absolute_path(attachment: Attachment) -> Path:
    return Path(UPLOAD_DIR) / attachment.storage_path


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

    rel_path = Path(user_id) / chat.id / f"{attachment.id}_{safe_name}"
    abs_path = Path(UPLOAD_DIR) / rel_path
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    total = 0
    try:
        with abs_path.open("wb") as out:
            while True:
                chunk = upload.file.read(64 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    out.close()
                    abs_path.unlink(missing_ok=True)
                    db.rollback()
                    raise AttachmentError(
                        f"File exceeds maximum size of {MAX_UPLOAD_BYTES} bytes",
                        http_status=413,
                    )
                out.write(chunk)
    finally:
        upload.file.close()

    attachment.size_bytes = total
    attachment.storage_path = str(rel_path)
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
