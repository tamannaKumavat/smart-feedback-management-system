import logging
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field

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
    print("[auth.login]", payload)
    return {"ok": True, "message": "Credentials received (not persisted)"}


@router.post("/signup")
def auth_signup(body: SignupBody):
    payload = body.model_dump(by_alias=True)
    log.info("auth.signup %s", payload)
    print("[auth.signup]", payload)
    return {"ok": True, "message": "Signup data received (not persisted)"}


@router.post("/forgot-password")
def auth_forgot_password(body: ForgotPasswordBody):
    payload = body.model_dump()
    log.info("auth.forgot_password %s", payload)
    print("[auth.forgot_password]", payload)
    return {"ok": True, "message": "Reset request received (not sent)"}
