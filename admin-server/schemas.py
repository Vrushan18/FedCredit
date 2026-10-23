"""
Pydantic schemas and Enums strictly adhering to:
FedCredit - Team Contract v1.0 (Section 3.1 - 3.4 & Section 4)
All enums and field names are FROZEN. Never rename them.
"""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# 3.2 Enums (Use EXACTLY these strings)
# ==============================================================================

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


class EmploymentType(str, Enum):
    SALARIED = "SALARIED"
    SELF_EMPLOYED = "SELF_EMPLOYED"
    BUSINESS = "BUSINESS"
    OTHER = "OTHER"


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class NotificationType(str, Enum):
    DOCUMENTS_VERIFIED = "DOCUMENTS_VERIFIED"
    DOCUMENTS_REQUIRED = "DOCUMENTS_REQUIRED"
    OFFICER_REVIEWING = "OFFICER_REVIEWING"
    STATUS_CHANGED = "STATUS_CHANGED"


class TrainingState(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    DONE = "DONE"


# ==============================================================================
# 3.4 Standard Error Body (All services)
# ==============================================================================

class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class StandardErrorResponse(BaseModel):
    error: ErrorDetails


# ==============================================================================
# Section 4: Auth Schemas
# ==============================================================================

class CustomerRegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str


class CustomerRegisterResponse(BaseModel):
    customer_id: str


class CustomerLoginRequest(BaseModel):
    email: str
    password: str


class CustomerProfile(BaseModel):
    customer_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class CustomerLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerProfile


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminProfile(BaseModel):
    username: str
    role: str = "admin"


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminProfile


# ==============================================================================
# Section 4: Bank Schemas
# ==============================================================================

class BankItem(BaseModel):
    bank_id: str
    name: str
    api_base_url: str
    online: bool


class HeartbeatRequest(BaseModel):
    api_base_url: str


class HeartbeatResponse(BaseModel):
    status: str = "ok"
    bank_id: str
    online: bool = True


# ==============================================================================
# Section 4: Application Index Schemas
# ==============================================================================

class CreateApplicationRequest(BaseModel):
    bank_id: str


class CreateApplicationResponse(BaseModel):
    application_id: str
    status: ApplicationStatus = ApplicationStatus.SUBMITTED


class ApplicationIndexItem(BaseModel):
    application_id: str
    bank_id: str
    bank_name: str
    status: ApplicationStatus
    created_at: str
    updated_at: str


class TimelineEvent(BaseModel):
    status: ApplicationStatus
    at: str
    message: Optional[str] = None


class ApplicationDetailResponse(BaseModel):
    application_id: str
    bank_id: str
    bank_name: str
    status: ApplicationStatus
    created_at: str
    updated_at: str
    timeline: List[TimelineEvent] = Field(default_factory=list)


class UpdateApplicationStatusRequest(BaseModel):
    status: ApplicationStatus
    message: Optional[str] = None


class CreateApplicationNotificationRequest(BaseModel):
    type: NotificationType
    message: str


# ==============================================================================
# Section 4: Notification Schemas
# ==============================================================================

class NotificationItem(BaseModel):
    id: int
    application_id: str
    type: str
    message: str
    read: bool
    created_at: str


# ==============================================================================
# Section 4: Fraud Registry Schemas (Section 7 FROZEN)
# ==============================================================================

class FraudCheckRequest(BaseModel):
    protected_id: str = Field(..., description="64-char lowercase hex or identifier")
    application_id: Optional[str] = Field(default="APP-GENERAL")


class FraudCheckResponse(BaseModel):
    fraud_status: FraudStatus
    registry_score: int
    reasons: List[str] = Field(default_factory=list)


class FraudFlagRequest(BaseModel):
    protected_id: str = Field(..., description="64-char lowercase hex or identifier")
    application_id: Optional[str] = Field(default="APP-GENERAL")
    reason: str = Field(default="Suspicious application pattern")


class FraudFlagResponse(BaseModel):
    protected_id: str
    flag_count: int
    status: FraudStatus
    message: str = "Identifier flagged successfully"


class FraudAlertItem(BaseModel):
    protected_id: str
    status: FraudStatus
    flag_count: int
    first_seen: str
    last_seen: str
    sightings_count: int
    recent_banks: List[str] = Field(default_factory=list)


# ==============================================================================
# Section 4: Training & Model Schemas
# ==============================================================================

class TrainingStatusResponse(BaseModel):
    state: TrainingState
    round: int
    total_rounds: int
    global_accuracy: Optional[float] = None
    model_version: str
    banks_connected: List[str] = Field(default_factory=list)


class LatestModelResponse(BaseModel):
    model_version: str
    coef: List[List[float]]
    intercept: List[float]


# ==============================================================================
# Section 4: Admin Dashboard Schemas
# ==============================================================================

class AdminDashboardStats(BaseModel):
    connected_banks: List[BankItem]
    total_applications: int
    total_customers: int
    training_status: TrainingStatusResponse
    total_fraud_alerts: int
    recent_audit_logs: List[Dict[str, Any]] = Field(default_factory=list)
