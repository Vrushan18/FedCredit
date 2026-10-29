from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from backend.config import settings, logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_employee_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "role": data.get("role", "OFFICER"), "type": "employee"})
    encoded_jwt = jwt.encode(to_encode, settings.EMPLOYEE_JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def decode_employee_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.EMPLOYEE_JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "employee":
            return None
        return payload
    except JWTError as e:
        logger.warning("Invalid employee JWT token: %s", str(e))
        return None
