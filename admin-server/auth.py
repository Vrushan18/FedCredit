"""
Auth utilities: password hashing via bcrypt, JWT creation and verification.
Implements two token types:
  - admin     signed with ADMIN_JWT_SECRET
  - customer  signed with CUSTOMER_JWT_SECRET
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from config import get_settings

_settings = get_settings()


# ── passwords (pure bcrypt) ───────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT ────────────────────────────────────────────────────────────────────────

def _create_token(data: dict, secret: str, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=_settings.access_token_expire_minutes)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, secret, algorithm=_settings.jwt_algorithm)


def create_admin_token(username: str) -> str:
    return _create_token({"sub": username, "role": "admin"}, _settings.admin_jwt_secret)


def create_customer_token(customer_id: str) -> str:
    return _create_token({"sub": customer_id, "role": "customer"}, _settings.customer_jwt_secret)


def decode_admin_token(token: str) -> dict:
    """Raises JWTError on invalid/expired token."""
    return jwt.decode(token, _settings.admin_jwt_secret, algorithms=[_settings.jwt_algorithm])


def decode_customer_token(token: str) -> dict:
    return jwt.decode(token, _settings.customer_jwt_secret, algorithms=[_settings.jwt_algorithm])
