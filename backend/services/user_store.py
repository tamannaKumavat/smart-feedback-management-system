from __future__ import annotations

from typing import Literal, TypedDict
from uuid import uuid4

Role = Literal["admin", "client"]


class UserRecord(TypedDict):
    id: str
    full_name: str
    email: str
    password: str
    role: Role


_users_by_email: dict[str, UserRecord] = {
    "admin@gmail.com": {
        "id": "u-admin-1",
        "full_name": "System Admin",
        "email": "admin@gmail.com",
        "password": "admin123",
        "role": "admin",
    },
    "client@gmail.com": {
        "id": "u-client-1",
        "full_name": "Client User",
        "email": "client@gmail.com",
        "password": "client123",
        "role": "client",
    },
}


def get_user_by_email(email: str) -> UserRecord | None:
    return _users_by_email.get(email.lower())


def add_client_user(full_name: str, email: str, password: str) -> UserRecord:
    normalized_email = email.lower()
    record: UserRecord = {
        "id": f"u-{uuid4().hex[:8]}",
        "full_name": full_name,
        "email": normalized_email,
        "password": password,
        "role": "client",
    }
    _users_by_email[normalized_email] = record
    return record


def list_users() -> list[UserRecord]:
    return list(_users_by_email.values())
