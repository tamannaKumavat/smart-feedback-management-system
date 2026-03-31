import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
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


@router.post("/login")
def auth_login(body: LoginBody):
    payload = body.model_dump(by_alias=True)
    log.info("auth.login %s", payload)
    email = payload["email"].lower()
    user = get_user_by_email(email)
    if user is None or user["password"] != payload["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {
        "ok": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "fullName": user["full_name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@router.post("/signup")
def auth_signup(body: SignupBody):
    payload = body.model_dump(by_alias=True)
    log.info("auth.signup %s", payload)
    if payload["password"] != payload["confirmPassword"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password must match",
        )
    if not payload["agreeToTerms"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to terms",
        )

    existing = get_user_by_email(payload["email"])
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    created = add_client_user(
        full_name=payload["fullName"].strip(),
        email=payload["email"],
        password=payload["password"],
    )
    return {
        "ok": True,
        "message": "Account created successfully",
        "user": {
            "id": created["id"],
            "fullName": created["full_name"],
            "email": created["email"],
            "role": created["role"],
        },
    }


@router.post("/forgot-password")
def auth_forgot_password(body: ForgotPasswordBody):
    payload = body.model_dump()
    log.info("auth.forgot_password %s", payload)
    print("[auth.forgot_password]", payload)
    return {"ok": True, "message": "Reset request received (not sent)"}


@router.get("/users")
def auth_users():
    users = list_users()
    return {
        "ok": True,
        "users": [
            {
                "id": user["id"],
                "fullName": user["full_name"],
                "email": user["email"],
                "role": user["role"],
            }
            for user in users
        ],
    }
