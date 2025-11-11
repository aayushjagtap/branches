from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt  # PyJWT
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# --- CONFIG ---
SECRET_KEY = "dev-secret-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 dependency (used in /auth/me)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --- PASSWORD HELPERS ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- TOKEN HELPERS ---
def _create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(tz=timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(sub: str, extra: Optional[Dict[str, Any]] = None) -> str:
    payload = {"sub": sub}
    if extra:
        payload.update(extra)
    return _create_token(payload, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(sub: str) -> str:
    return _create_token({"sub": sub, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

def decode_token(token: str) -> dict:
    """Decode a JWT and return its payload (raises if invalid/expired)."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# --- AUTH HELPERS ---
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Extract and validate the current user from the access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return {"email": email}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

