import datetime
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend.models import Employee

security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode("utf-8")
    if isinstance(plain_password, str):
        plain_password = plain_password.encode("utf-8")
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    if isinstance(password, str):
        password = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password, salt).decode("utf-8")

def create_employee_token(employee: Employee, expires_delta: datetime.timedelta = None) -> str:
    if expires_delta is None:
        expires_delta = datetime.timedelta(hours=12)
    expire = datetime.datetime.utcnow() + expires_delta
    payload = {
        "sub": employee.username,
        "id": employee.id,
        "role": employee.role,
        "bank_id": settings.BANK_ID,
        "exp": expire
    }
    token = jwt.encode(payload, settings.EMPLOYEE_JWT_SECRET, algorithm="HS256")
    return token

def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Employee:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Missing bearer token", "details": {}}
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.EMPLOYEE_JWT_SECRET, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "UNAUTHENTICATED", "message": "Invalid token subject", "details": {}}
            )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": f"Token verification failed: {str(e)}", "details": {}}
        )
        
    employee = db.query(Employee).filter(Employee.username == username).first()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Employee record not found", "details": {}}
        )
    return employee

def verify_customer_jwt(token: str, expected_customer_id: str) -> dict:
    """Verifies customer JWT issued by Head Office and checks customer_id matches."""
    try:
        payload = jwt.decode(token, settings.CUSTOMER_JWT_SECRET, algorithms=["HS256"])
        cust_id = payload.get("customer_id") or payload.get("sub")
        if not cust_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "UNAUTHENTICATED", "message": "Token does not contain customer_id", "details": {}}
            )
        if cust_id != expected_customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Customer ID in token ({cust_id}) does not match application payload ({expected_customer_id})",
                    "details": {}
                }
            )
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": f"Customer JWT invalid: {str(e)}", "details": {}}
        )
