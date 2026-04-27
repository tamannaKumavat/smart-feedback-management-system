import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from db import get_db
from models.user import User
from services.security import (
    create_access_token,
    get_current_user,
    verify_password,
)
from services.user_store import add_client_user, get_user_by_email, list_users

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = logging.getLogger(__name__)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = Field(False, alias="rememberMe")
    model_config = {"populate_by_name": True}


class SignupBody(BaseModel):
    full_name: str = Field(..., min_length=1, alias="fullName")
    email: EmailStr
    password: str = Field(..., min_length=1)
    confirm_password: str = Field(..., min_length=1, alias="confirmPassword")
    agree_to_terms: bool = Field(..., alias="agreeToTerms")
    model_config = {"populate_by_name": True}


class ForgotPasswordBody(BaseModel):
    email: EmailStr


def _user_dto(user: User) -> dict:
    return {
        "id": user.id,
        "fullName": user.full_name,
        "email": user.email,
        "role": user.role,
    }


def _issue_token(user: User, remember_me: bool = False) -> str:
    minutes = 60 * 24 * 7 if remember_me else None
    return create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email},
        expires_minutes=minutes,
    )


@router.post("/login")
def auth_login(body: LoginBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    user = get_user_by_email(db, email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = _issue_token(user, remember_me=body.remember_me)
    return {
        "ok": True,
        "message": "Login successful",
        "accessToken": token,
        "tokenType": "bearer",
        "user": _user_dto(user),
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def auth_signup(body: SignupBody, db: Session = Depends(get_db)):
    if body.password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match",
        )
    if not body.agree_to_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to terms",
        )

    if get_user_by_email(db, body.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    created = add_client_user(
        db,
        full_name=body.full_name.strip(),
        email=body.email,
        password=body.password,
    )
    token = _issue_token(created)
    return {
        "ok": True,
        "message": "Account created successfully",
        "accessToken": token,
        "tokenType": "bearer",
        "user": _user_dto(created),
    }


@router.post("/forgot-password")
def auth_forgot_password(body: ForgotPasswordBody):
    log.info("auth.forgot_password %s", body.model_dump())
    return {"ok": True, "message": "Reset request received (not sent)"}


@router.get("/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return {"ok": True, "user": _user_dto(current_user)}


@router.get("/users")
def auth_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    users = list_users(db)
    return {"ok": True, "users": [_user_dto(u) for u in users]}
