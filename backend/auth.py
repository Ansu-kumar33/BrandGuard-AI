from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
from typing import Annotated, Any

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    AuthenticatedUserRead,
    AuthTokenResponse,
    LoginRequest,
    RegisterRequest,
)

load_dotenv(Path(__file__).with_name(".env"))
router = APIRouter(prefix="/api/auth", tags=["authentication"])
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)
JWT_ISSUER = "brandguard-ai"
JWT_ALGORITHM = "HS256"
DUMMY_PASSWORD_HASH = password_hasher.hash("not-a-real-user-password")


def auth_settings() -> tuple[str, int]:
    secret = os.getenv("JWT_SECRET_KEY", "").strip()
    if len(secret) < 32 or secret == "replace_with_a_random_32_byte_or_longer_secret":
        raise RuntimeError(
            "JWT_SECRET_KEY must be configured with at least 32 characters."
        )
    try:
        expiry_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    except ValueError as error:
        raise RuntimeError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer."
        ) from error
    if not 1 <= expiry_minutes <= 10080:
        raise RuntimeError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 10080."
        )
    return secret, expiry_minutes


def validate_auth_config() -> None:
    auth_settings()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def user_to_read(user: User) -> AuthenticatedUserRead:
    return AuthenticatedUserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
    )


def create_access_token(user: User) -> AuthTokenResponse:
    secret, expiry_minutes = auth_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
    token = jwt.encode(
        {
            "sub": user.id,
            "iss": JWT_ISSUER,
            "iat": datetime.now(timezone.utc),
            "exp": expires_at,
        },
        secret,
        algorithm=JWT_ALGORITHM,
    )
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expiry_minutes * 60,
        user=user_to_read(user),
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication is required.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    secret, _ = auth_settings()
    try:
        claims: dict[str, Any] = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
    except jwt.InvalidTokenError:
        raise unauthorized from None

    user_id = claims.get("sub")
    if not isinstance(user_id, str):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "/register",
    response_model=AuthenticatedUserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest, db: Annotated[Session, Depends(get_db)]
) -> AuthenticatedUserRead:
    user = User(
        name=data.name,
        email=str(data.email).lower(),
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error
    db.refresh(user)
    return user_to_read(user)


@router.post("/login", response_model=AuthTokenResponse)
def login(
    data: LoginRequest, db: Annotated[Session, Depends(get_db)]
) -> AuthTokenResponse:
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    if not verify_password(data.password, password_hash) or user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return create_access_token(user)


@router.get("/me", response_model=AuthenticatedUserRead)
def get_me(current_user: CurrentUser) -> AuthenticatedUserRead:
    return user_to_read(current_user)
