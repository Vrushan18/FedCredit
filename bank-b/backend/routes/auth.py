from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Employee
from backend.auth import verify_password, create_employee_access_token
from backend.schemas import EmployeeLoginRequest, TokenResponse, EmployeeResponse
from backend.dependencies import get_current_employee
from backend.config import logger

router = APIRouter(prefix="/api/auth", tags=["Employee Authentication"])

@router.post("/employee/login", response_model=TokenResponse)
def employee_login(payload: EmployeeLoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.username == payload.username).first()
    if not employee or not verify_password(payload.password, employee.hashed_password):
        logger.warning("Failed login attempt for username: %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Invalid employee username or password."}
        )
    
    access_token = create_employee_access_token(
        data={"sub": employee.username, "role": employee.role, "id": employee.id}
    )
    logger.info("Employee logged in successfully: %s", employee.username)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "username": employee.username,
            "role": employee.role
        }
    }

@router.get("/me", response_model=EmployeeResponse)
def get_current_employee_info(current_employee: Employee = Depends(get_current_employee)):
    return current_employee
