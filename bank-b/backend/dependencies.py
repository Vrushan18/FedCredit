from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Employee
from backend.auth import decode_employee_access_token
from backend.schemas import ErrorEnvelope, ErrorDetail
from backend.config import logger

security = HTTPBearer(auto_error=False)

def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Employee:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Authentication credentials were not provided."}
        )
    
    payload = decode_employee_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Invalid or expired employee token."}
        )
    
    username = payload["sub"]
    employee = db.query(Employee).filter(Employee.username == username).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Employee account not found."}
        )
    
    return employee

def get_optional_current_employee(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[Employee]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_employee_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    username = payload["sub"]
    return db.query(Employee).filter(Employee.username == username).first()

# --- Global Custom Exception Handlers for Frozen Error Envelope ---

async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = exc.detail.get("code", "SERVER_ERROR")
        message = exc.detail.get("message", "An error occurred.")
        details = exc.detail.get("details", {})
    else:
        code = "SERVER_ERROR" if exc.status_code >= 500 else "VALIDATION_ERROR"
        if exc.status_code == 401:
            code = "UNAUTHENTICATED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 409:
            code = "CONFLICT"
        message = str(exc.detail)
        details = {}

    envelope = ErrorEnvelope(error=ErrorDetail(code=code, message=message, details=details))
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump())

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="Request body validation failed.",
            details={"errors": exc.errors()}
        )
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=envelope.model_dump())

async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Exception: %s", str(exc), exc_info=True)
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code="SERVER_ERROR",
            message="An unexpected internal server error occurred.",
            details={}
        )
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=envelope.model_dump())
