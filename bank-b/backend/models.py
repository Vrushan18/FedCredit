from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="OFFICER", nullable=False)

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String, primary_key=True, index=True)  # e.g., CUST-000001
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    occupation = Column(String, nullable=False)
    employment_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("LoanApplication", back_populates="customer")

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    application_id = Column(String, primary_key=True, index=True)  # e.g., APP-2026-000001
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False)
    
    # Financial fields (Model + KYC)
    income = Column(Float, nullable=False)  # annual_income
    employment_length_years = Column(Float, nullable=False)
    debt = Column(Float, nullable=False)  # existing_debt (Local KYC field, excluded from 17-feature FL model)
    credit_score = Column(Integer, nullable=False)  # Local KYC field, excluded from 17-feature FL model
    loan_amount = Column(Float, nullable=False)
    loan_purpose = Column(String, nullable=False)  # Frozen enum
    home_ownership = Column(String, nullable=False)  # Frozen enum
    previous_default = Column(Integer, default=0, nullable=False)  # 0 or 1
    
    # Application state
    status = Column(String, default="SUBMITTED", nullable=False)  # Frozen enum
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="applications")
    documents = relationship("ApplicationDocument", back_populates="application")
    predictions = relationship("Prediction", back_populates="application")

class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(String, ForeignKey("loan_applications.application_id"), nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("LoanApplication", back_populates="documents")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(String, ForeignKey("loan_applications.application_id"), nullable=False)
    risk_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    default_prob = Column(Float, nullable=False)
    recommendation = Column(String, nullable=False)  # ELIGIBLE, HOLD_FOR_VERIFICATION, NOT_RECOMMENDED
    shap_values = Column(JSON, nullable=True)  # SHAP factors dict/list
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("LoanApplication", back_populates="predictions")

class LocalTrainingLog(Base):
    __tablename__ = "local_training_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    round = Column(Integer, nullable=False)
    local_loss = Column(Float, nullable=False)
    local_accuracy = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protected_id = Column(String(64), nullable=False, index=True)  # 64-char HMAC-SHA256 hex
    application_id = Column(String, ForeignKey("loan_applications.application_id"), nullable=False)
    reason = Column(String, nullable=False)
    flagged_at = Column(DateTime, default=datetime.utcnow)

class CustomerKycBinding(Base):
    __tablename__ = "customer_kyc_bindings"

    aadhaar_hash = Column(String(64), primary_key=True, index=True)
    protected_id = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
