import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="LOAN_OFFICER")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String(50), primary_key=True, index=True) # e.g. CUST-000001
    name = Column(String(200), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    occupation = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    applications = relationship("LoanApplication", back_populates="customer")

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    application_id = Column(String(50), primary_key=True, index=True) # e.g. APP-2026-000001
    customer_id = Column(String(50), ForeignKey("customers.customer_id"), nullable=False, index=True)
    
    # Financial fields
    annual_income = Column(Float, nullable=False)
    existing_debt = Column(Float, nullable=False)
    credit_score = Column(Integer, nullable=False)
    home_ownership = Column(String(50), nullable=False) # RENT, OWN, MORTGAGE, OTHER
    employment_length_years = Column(Float, nullable=False)
    credit_history_length_years = Column(Float, nullable=False)
    previous_default = Column(Boolean, default=False)
    
    # Loan specifics
    loan_amount = Column(Float, nullable=False)
    duration_months = Column(Integer, nullable=False)
    purpose = Column(String(50), nullable=False) # EDUCATION, MEDICAL, VENTURE, PERSONAL, DEBT_CONSOLIDATION, HOME_IMPROVEMENT
    
    # Applicant KYC details
    applicant_name = Column(String(200), nullable=True)
    applicant_age = Column(Integer, nullable=True)
    applicant_gender = Column(String(20), nullable=True)
    applicant_address = Column(Text, nullable=True)
    applicant_phone = Column(String(50), nullable=True)
    applicant_occupation = Column(String(100), nullable=True)
    applicant_employment_type = Column(String(50), nullable=True)
    
    # Privacy protected fingerprint hash (HMAC-SHA256)
    protected_id = Column(String(64), nullable=True, index=True)
    
    # Status according to FROZEN contract
    # SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, VERIFICATION_REQUIRED
    status = Column(String(50), default="SUBMITTED", nullable=False, index=True)
    
    # Bank officer decision: APPROVED, REJECTED, ON_HOLD
    officer_decision = Column(String(50), nullable=True)
    decision_notes = Column(Text, nullable=True)
    
    # Raw payload backup
    raw_payload = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="applications")
    documents = relationship("ApplicationDocument", back_populates="application")
    prediction = relationship("Prediction", back_populates="application", uselist=False)

class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    doc_type = Column(String(100), default="DOCUMENT")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("LoanApplication", back_populates="documents")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False, unique=True, index=True)
    risk_level = Column(String(20), nullable=False) # LOW, MEDIUM, HIGH
    default_prob = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    recommendation = Column(String(50), nullable=False) # ELIGIBLE, HOLD_FOR_VERIFICATION, NOT_RECOMMENDED
    shap_values = Column(JSON, nullable=False) # Top 5 factors
    fraud_score = Column(Integer, default=0)
    fraud_status = Column(String(50), default="SAFE") # SAFE, REVIEW_NEEDED, SUSPICIOUS
    fraud_reasons = Column(JSON, default=list)
    model_version = Column(String(50), default="v1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("LoanApplication", back_populates="prediction")

class LocalTrainingLog(Base):
    __tablename__ = "local_training_logs"

    id = Column(Integer, primary_key=True, index=True)
    round = Column(Integer, nullable=False)
    local_loss = Column(Float, nullable=False)
    local_accuracy = Column(Float, nullable=False)
    num_samples = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(Integer, primary_key=True, index=True)
    protected_id = Column(String(64), nullable=False, index=True)
    application_id = Column(String(50), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    flagged_at = Column(DateTime, default=datetime.datetime.utcnow)

class CustomerKycBinding(Base):
    __tablename__ = "customer_kyc_bindings"

    aadhaar_hash = Column(String(64), primary_key=True, index=True)
    protected_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SyncQueueItem(Base):
    __tablename__ = "sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), nullable=False)
    target_status = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)
    attempts = Column(Integer, default=0)
    status = Column(String(20), default="PENDING") # PENDING, SUCCESS, FAILED
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_attempt = Column(DateTime, nullable=True)
