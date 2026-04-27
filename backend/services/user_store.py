from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.user import User
from services.security import hash_password


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email.lower())
    return db.execute(stmt).scalar_one_or_none()


def add_client_user(
    db: Session, full_name: str, email: str, password: str, role: str = "client"
) -> User:
    user = User(
        full_name=full_name,
        email=email.lower(),
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return list(db.execute(select(User).order_by(User.created_at)).scalars())
