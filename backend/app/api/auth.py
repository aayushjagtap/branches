from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Dict
from fastapi.security import OAuth2PasswordRequestForm  # <-- add this
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

USERS: Dict[str, str] = {}

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    email = payload.email.lower()
    if email in USERS:
        raise HTTPException(status_code=409, detail="Email already registered")
    USERS[email] = hash_password(payload.password)
    return TokenResponse(
        access_token=create_access_token(email),
        refresh_token=create_refresh_token(email),
    )

# 🔁 UPDATED: accepts OAuth2 password **form** (username/password)
@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Swagger's Authorize dialog sends "username" and "password"
    email = form_data.username.lower()
    password = form_data.password

    hashed = USERS.get(email)
    if not hashed or not verify_password(password, hashed):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(email),
        refresh_token=create_refresh_token(email),
    )

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

