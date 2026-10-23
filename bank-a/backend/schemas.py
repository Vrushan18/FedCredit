from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

# --- FROZEN ENUMS (Section 3.2 & 7) ---
class ApplicationStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"

class OfficerDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class FraudStatus(str, Enum):
    SAFE = "SAFE"
    REVIEW_NEEDED = "REVIEW_NEEDED"
    SUSPICIOUS = "SUSPICIOUS"

class Recommendation(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    HOLD_FOR_VERIFICATION = "HOLD_FOR_VERIFICATION"
    NOT_RECOMMENDED = "NOT_RECOMMENDED"

class HomeOwnership(str, Enum):
    RENT = "RENT"
    OWN = "OWN"
    MORTGAGE = "MORTGAGE"
    OTHER = "OTHER"

class LoanPurpose(str, Enum):
    EDUCATION = "EDUCATION"
    MEDICAL = "MEDICAL"
    VENTURE = "VENTURE"
    PERSONAL = "PERSONAL"
    DEBT_CONSOLIDATION = "DEBT_CONSOLIDATION"
    HOME_IMPROVEMENT = "HOME_IMPROVEMENT"

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"

class EmploymentType(str, Enum):
    SALARIED = "SALARIED"
    SELF_EMPLOYED = "SELF_EMPLOYED"
    BUSINESS = "BUSINESS"
    OTHER = "OTHER"

# --- CANONICAL APPLICATION PAYLOAD (Section 3.3) ---
class ApplicantInfo(BaseModel):
    full_name: str
    age: int
    gender: Gender
    address: str
    phone: str
    occupation: str
    employment_type: EmploymentType
    pan: Optional[str] = None
    aadhaar: Optional[str] = None

class FinancialInfo(BaseModel):
    annual_income: float
    existing_debt: float
    credit_score: int
    home_ownership: HomeOwnership
    employment_length_years: float
    credit_history_length_years: float
    previous_default: bool

class LoanInfo(BaseModel):
    amount: float
    duration_months: int
    purpose: LoanPurpose

class CanonicalApplicationPayload(BaseModel):
    application_id: str
    customer_id: str
    applicant: ApplicantInfo
    financial: FinancialInfo
    loan: LoanInfo

# --- STANDARD ERROR ENVELOPE (Section 3.4 & 9) ---
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class ErrorEnvelope(BaseModel):
    error: ErrorDetail

# --- FROZEN PREDICT RESPONSE (Section 5) ---
class ShapFactor(BaseModel):
    feature: str
    label: str
    impact: float
    direction: str # "POSITIVE" or "NEGATIVE"

class FraudSummary(BaseModel):
    status: FraudStatus
    score: int
    reasons: List[str]

class PredictResponse(BaseModel):
    risk_level: RiskLevel
    default_probability: float
    confidence: float
    recommendation: Recommendation
    explanation: List[ShapFactor]
    fraud: FraudSummary
    model_version: str

# --- OFFICER DECISION & FRAUD FLAG ---
class DecisionRequest(BaseModel):
    decision: OfficerDecision
    note: Optional[str] = ""

class DecisionResponse(BaseModel):
    application_id: str
    decision: OfficerDecision
    status: ApplicationStatus
    message: str

class FlagRequest(BaseModel):
    reason: str

class FlagResponse(BaseModel):
    protected_id: str
    application_id: str
    status: str
    flag_count: Optional[int] = 1

# --- AUTH & EMPLOYEE SCHEMAS ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: Dict[str, Any]

class EmployeeOut(BaseModel):
    id: int
    username: str
    role: str

# --- CUSTOMER CRUD SCHEMAS ---
class CustomerCreate(BaseModel):
    customer_id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    employment_type: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    employment_type: Optional[str] = None
    notes: Optional[str] = None

class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    customer_id: str
    name: str
    age: Optional[int]
    gender: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    occupation: Optional[str]
    employment_type: Optional[str]
    notes: Optional[str]
    created_at: Any

# --- DASHBOARD STATS ---
class DashboardStats(BaseModel):
    total_customers: int
    pending_loans: int
    approved_loans: int
    rejected_loans: int
    on_hold_loans: int
    today_applications: int
    local_model_accuracy: float
    last_sync_time: Optional[str]
    bank_id: str
    bank_name: str
