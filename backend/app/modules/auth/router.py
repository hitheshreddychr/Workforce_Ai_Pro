
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SessionResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)

# Load environment variables from the project-root .env file.
PROJECT_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(PROJECT_ROOT / ".env")

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET_KEY is missing or too short. "
        "Check the JWT_SECRET_KEY entry in your project-root .env file."
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30
RESET_TOKEN_MINUTES = 15

# Temporary in-memory reset-token tracking for local development.
# Persistent storage is required for production.
used_reset_tokens = set()


def create_token(
    subject: str,
    token_type: str,
    expires_minutes: int,
) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "jti": str(uuid4()),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        if payload.get("type") != "access":
            raise credentials_error

        user_id = payload.get("sub")

        if not user_id:
            raise credentials_error

        user = (
            db.query(User)
            .filter(User.id == int(user_id))
            .first()
        )

    except (JWTError, ValueError, TypeError):
        raise credentials_error

    if user is None or not user.is_active:
        raise credentials_error

    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: UserRegister,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        full_name=data.full_name.strip(),
        email=email,
        hashed_password=password_hash.hash(data.password),
        role="HR",
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create account.",
        )

    return user


@router.post("/login", response_model=TokenResponse)
def login_user(
    data: UserLogin,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        user is None
        or not user.is_active
        or not password_hash.verify(
            data.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_token(
        subject=str(user.id),
        token_type="access",
        expires_minutes=ACCESS_TOKEN_MINUTES,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_MINUTES * 60,
    )


@router.get("/me", response_model=SessionResponse)
def validate_session(
    current_user: User = Depends(get_current_user),
):
    return SessionResponse(
        authenticated=True,
        user=current_user,
    )


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # Keep responses generic to avoid revealing registered email addresses.
    # Reset-token creation and email delivery still need implementation.
    if user and user.is_active:
        pass

    return {
        "message": (
            "If an eligible account exists, "
            "password reset instructions will be sent."
        )
    }


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired password reset token.",
    )

    try:
        payload = jwt.decode(
            data.token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        if payload.get("type") != "password_reset":
            raise credentials_error

        user_id = payload.get("sub")
        token_id = payload.get("jti")

        if (
            not user_id
            or not token_id
            or token_id in used_reset_tokens
        ):
            raise credentials_error

        user = (
            db.query(User)
            .filter(User.id == int(user_id))
            .first()
        )

        if user is None or not user.is_active:
            raise credentials_error

    except (JWTError, ValueError, TypeError):
        raise credentials_error

    user.hashed_password = password_hash.hash(
        data.new_password
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password.",
        )

    used_reset_tokens.add(token_id)

    return {
        "message": "Password reset successfully. Please log in again."
    }
