from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Standard Error Envelope Schema (FROZEN SPEC 9) ---
class ErrorDetail(BaseModel):
    code: str  # VALIDATION_ERROR | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | SERVER_ERROR
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class ErrorEnvelope(BaseModel):
    error: ErrorDetail

# --- Employee Auth Schemas ---
class EmployeeLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: Dict[str, Any]

class EmployeeResponse(BaseModel):
    id: int
    username: str
    role: str

# --- Customer Schemas (Local KYC Data) ---
class CustomerBase(BaseModel):
    name: str
    age: int
    gender: str
    address: str
    phone: str
    occupation: str
    employment_type: str

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    customer_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Loan Application Schemas ---
class LoanApplicationCreate(BaseModel):
    application_id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: Optional[str] = None
    
    income: Optional[float] = None
    annual_income: Optional[float] = None
    
    employment_length_years: Optional[float] = None
    employment_length: Optional[float] = None
    
    debt: Optional[float] = None
    existing_debt: Optional[float] = None
    
    credit_score: Optional[int] = 700
    credit_history_length_years: Optional[float] = 5.0
    
    loan_amount: Optional[float] = None
    amount: Optional[float] = None
    
    loan_purpose: Optional[str] = "PERSONAL"
    purpose: Optional[str] = None
    
    home_ownership: Optional[str] = "RENT"
    ownership: Optional[str] = None
    
    previous_default: Optional[int] = 0
    
    customer_name: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    employment_type: Optional[str] = None
    biometric_file_base64: Optional[str] = None

class LoanApplicationStatusUpdate(BaseModel):
    status: str  # SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, VERIFICATION_REQUIRED
    message: Optional[str] = None

class LoanApplicationResponse(BaseModel):
    application_id: str
    customer_id: str
    income: float
    employment_length_years: float
    debt: float
    credit_score: int
    loan_amount: float
    loan_purpose: str
    home_ownership: str
    previous_default: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Health Check Response ---
class HealthResponse(BaseModel):
    status: str
    bank_id: str
    version: str = "1.0.0"
    database_status: str
    head_office_mode: str
    flower_status: str
