"""Auth routes."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)

router = APIRouter()

# ── In-memory user store (replace with DB in production) ──────────────────────
_DEMO_USERS = {
    "admin@deeptracknet.ai": {
        "id": 1,
        "email": "admin@deeptracknet.ai",
        "full_name": "System Administrator",
        "role": "admin",
        "is_active": True,
        "password_hash": get_password_hash("Admin@123"),
    },
    "security@deeptracknet.ai": {
        "id": 2,
        "email": "security@deeptracknet.ai",
        "full_name": "Security Officer",
        "role": "security_officer",
        "is_active": True,
        "password_hash": get_password_hash("Security@123"),
    },
    "manager@deeptracknet.ai": {
        "id": 3,
        "email": "manager@deeptracknet.ai",
        "full_name": "Event Manager",
        "role": "event_manager",
        "is_active": True,
        "password_hash": get_password_hash("Manager@123"),
    },
    "viewer@deeptracknet.ai": {
        "id": 4,
        "email": "viewer@deeptracknet.ai",
        "full_name": "Viewer Account",
        "role": "viewer",
        "is_active": True,
        "password_hash": get_password_hash("Viewer@123"),
    },
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Authenticate user and return JWT tokens."""
    user = _DEMO_USERS.get(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user["is_active"]:
        raise HTTPException(400, "Account is disabled")

    access_token = create_access_token({"sub": user["email"], "role": user["role"]})
    refresh_token = create_refresh_token({"sub": user["email"]})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "password_hash"},
    }


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    """Issue a new access token using a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(400, "Invalid token type")
    email = payload.get("sub")
    user = _DEMO_USERS.get(email)
    if not user:
        raise HTTPException(401, "User not found")
    access_token = create_access_token({"sub": email, "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_me(token: str = None):
    """Get current user profile (requires Authorization header)."""
    return {"message": "Attach Bearer token to Authorization header", "demo_accounts": [
        {"email": "admin@deeptracknet.ai", "password": "Admin@123", "role": "admin"},
        {"email": "security@deeptracknet.ai", "password": "Security@123", "role": "security_officer"},
        {"email": "viewer@deeptracknet.ai", "password": "Viewer@123", "role": "viewer"},
    ]}
