import base64
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import Customer, LoanApplication, Prediction, Employee, FraudFlag
from backend.schemas import LoanApplicationCreate, LoanApplicationResponse, LoanApplicationStatusUpdate
from backend.dependencies import get_current_employee, get_optional_current_employee
from backend.utils.fraud import generate_protected_id, verify_identity_biometric_binding
from backend.services.head_office import HeadOfficeFraudClient
from ml.predict import PredictionService
from ml.preprocessing import DatasetBlockerException
from backend.config import logger

router = APIRouter(tags=["Loan Application Processing"])
head_office_client = HeadOfficeFraudClient()
prediction_service = PredictionService()

VALID_APPLICATION_STATUSES = {"SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "VERIFICATION_REQUIRED"}
VALID_OFFICER_DECISIONS = {"APPROVED", "REJECTED", "ON_HOLD"}
VALID_LOAN_PURPOSES = {"EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT"}
VALID_HOME_OWNERSHIPS = {"RENT", "OWN", "MORTGAGE", "OTHER"}

# Allowed status transitions rule map
ALLOWED_TRANSITIONS = {
    "SUBMITTED": {"UNDER_REVIEW", "APPROVED", "REJECTED", "VERIFICATION_REQUIRED"},
    "UNDER_REVIEW": {"APPROVED", "REJECTED", "VERIFICATION_REQUIRED"},
    "VERIFICATION_REQUIRED": {"APPROVED", "REJECTED", "UNDER_REVIEW"},
    "APPROVED": set(),  # Terminal state
    "REJECTED": set()   # Terminal state
}

def generate_next_application_id(db: Session) -> str:
    year = datetime.now().year
    prefix = f"APP-{year}-"
    apps = db.query(LoanApplication.application_id).filter(LoanApplication.application_id.like(f"{prefix}%")).all()
    max_id = 0
    for (app_id,) in apps:
        try:
            num = int(app_id.replace(prefix, ""))
            if num > max_id:
                max_id = num
        except ValueError:
            continue
    return f"{prefix}{(max_id + 1):06d}"

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_loan_application(
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Optional[Employee] = Depends(get_optional_current_employee)
):
    content_type = request.headers.get("content-type", "")
    bio_bytes = b""
    aadhaar_val = None
    pan_val = None
    app_id_param = None

    if "application/json" in content_type:
        raw_json = await request.json()
        payload = LoanApplicationCreate(**raw_json)
        app_id_param = payload.application_id
        cust_id = payload.customer_id or payload.user_id or f"CUST-{int(datetime.now().timestamp())}"
        income_val = payload.income if payload.income is not None else (payload.annual_income or 500000.0)
        emp_len_val = payload.employment_length_years if payload.employment_length_years is not None else (payload.employment_length or 3.0)
        debt_val = payload.debt if payload.debt is not None else (payload.existing_debt or 0.0)
        credit_score_val = payload.credit_score or 700
        loan_amt_val = payload.loan_amount if payload.loan_amount is not None else (payload.amount or 100000.0)
        purpose_val = (payload.loan_purpose or payload.purpose or "PERSONAL").strip().upper()
        ownership_val = (payload.home_ownership or payload.ownership or "RENT").strip().upper()
        prev_default_val = payload.previous_default or 0
        cust_name = payload.customer_name or payload.name or payload.full_name or f"Customer {cust_id}"
        age_val = payload.age or 35
        gender_val = payload.gender or "Other"
        phone_val = payload.phone or "+91-0000000000"
        address_val = payload.address or "Address Not Provided"
        occupation_val = payload.occupation or "Unspecified"
        emp_type_val = payload.employment_type or "Salaried"
        aadhaar_val = payload.aadhaar
        pan_val = payload.pan
        if payload.biometric_file_base64:
            try:
                bio_bytes = base64.b64decode(payload.biometric_file_base64)
            except Exception:
                bio_bytes = b""
    else:
        form = await request.form()
        app_id_param = form.get("application_id")
        cust_id = form.get("customer_id") or form.get("user_id") or f"CUST-{int(datetime.now().timestamp())}"
        income_val = float(form.get("income") or form.get("annual_income") or 500000.0)
        emp_len_val = float(form.get("employment_length_years") or form.get("employment_length") or 3.0)
        debt_val = float(form.get("debt") or form.get("existing_debt") or 0.0)
        credit_score_val = int(form.get("credit_score") or 700)
        loan_amt_val = float(form.get("loan_amount") or form.get("amount") or 100000.0)
        purpose_val = str(form.get("loan_purpose") or form.get("purpose") or "PERSONAL").strip().upper()
        ownership_val = str(form.get("home_ownership") or form.get("ownership") or "RENT").strip().upper()
        prev_default_val = int(form.get("previous_default") or 0)
        cust_name = form.get("customer_name") or form.get("name") or form.get("full_name") or f"Customer {cust_id}"
        age_val = int(form.get("age") or 35)
        gender_val = form.get("gender") or "Other"
        phone_val = form.get("phone") or "+91-0000000000"
        address_val = form.get("address") or "Address Not Provided"
        occupation_val = form.get("occupation") or "Unspecified"
        emp_type_val = form.get("employment_type") or "Salaried"
        aadhaar_val = form.get("aadhaar")
        pan_val = form.get("pan")

        bio_file = form.get("biometric_file")
        if bio_file and hasattr(bio_file, "read"):
            bio_bytes = await bio_file.read()

    # Validate enums
    if purpose_val not in VALID_LOAN_PURPOSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"Invalid loan_purpose '{purpose_val}'. Allowed values: {sorted(list(VALID_LOAN_PURPOSES))}"
            }
        )
    if ownership_val not in VALID_HOME_OWNERSHIPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"Invalid home_ownership '{ownership_val}'. Allowed values: {sorted(list(VALID_HOME_OWNERSHIPS))}"
            }
        )

    # Check if customer exists; if not, auto-create local customer KYC record
    customer = db.query(Customer).filter(Customer.customer_id == cust_id).first()
    if not customer:
        logger.info("Customer ID '%s' not found locally. Auto-creating customer KYC record.", cust_id)
        customer = Customer(
            customer_id=cust_id,
            name=cust_name,
            age=age_val,
            gender=gender_val,
            address=address_val,
            phone=phone_val,
            occupation=occupation_val,
            employment_type=emp_type_val
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    app_id = app_id_param or generate_next_application_id(db)

    # Biometric processing & 64-char HMAC Protected ID
    protected_id = None
    if bio_bytes:
        if len(bio_bytes) < 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "VALIDATION_ERROR", "message": "Corrupted biometric file (<1000 bytes)."}
            )
        protected_id = generate_protected_id(bio_bytes)

    # 1. Identity Mismatch Check (Aadhaar-to-Biometric Binding)
    if aadhaar_val and protected_id:
        if not verify_identity_biometric_binding(db, aadhaar_val, protected_id):
            logger.warning("Identity mismatch! Aadhaar %s presented with different biometric", aadhaar_val)
            try:
                head_office_client.flag_fraud(protected_id, app_id, "Synthetic identity: Biometric mismatch against KYC record")
            except Exception:
                pass
            head_office_client.patch_application_status(app_id, "REJECTED", "Rejected: Biometric mismatch against KYC record")
            
            db.add(FraudFlag(
                application_id=app_id,
                protected_id=protected_id,
                reason="Synthetic identity: Biometric mismatch against KYC record"
            ))
            rejected_app = LoanApplication(
                application_id=app_id,
                customer_id=cust_id,
                income=income_val,
                employment_length_years=emp_len_val,
                debt=debt_val,
                credit_score=credit_score_val,
                loan_amount=loan_amt_val,
                loan_purpose=purpose_val,
                home_ownership=ownership_val,
                previous_default=prev_default_val,
                status="REJECTED"
            )
            db.add(rejected_app)
            db.commit()
            return {
                "status": "REJECTED",
                "reason": "Biometric mismatch against submitted Aadhaar record",
                "fraud_flagged": True,
                "application_id": app_id,
                "customer_id": cust_id
            }

    # 2. Query Head Office Section 7 Fraud Registry (Cross-Bank Loan Stacking Check)
    if protected_id:
        try:
            fraud_result = head_office_client.check_fraud(protected_id, app_id)
            fraud_status = fraud_result.get("fraud_status", "SAFE")
            registry_score = fraud_result.get("registry_score", 0)
        except Exception:
            fraud_status = "SAFE"
            registry_score = 0

        if fraud_status == "SUSPICIOUS":
            logger.warning("Cross-Bank Loan Stacking detected for %s", app_id)
            head_office_client.patch_application_status(app_id, "REJECTED", "Rejected: Inter-bank loan stacking detected across consortium")
            db.add(FraudFlag(
                application_id=app_id,
                protected_id=protected_id,
                reason="Cross-Bank Loan Stacking detected at Head Office"
            ))
            rejected_app = LoanApplication(
                application_id=app_id,
                customer_id=cust_id,
                income=income_val,
                employment_length_years=emp_len_val,
                debt=debt_val,
                credit_score=credit_score_val,
                loan_amount=loan_amt_val,
                loan_purpose=purpose_val,
                home_ownership=ownership_val,
                previous_default=prev_default_val,
                status="REJECTED"
            )
            db.add(rejected_app)
            db.commit()
            return {
                "status": "REJECTED",
                "reason": "Cross-Bank Loan Stacking detected at Head Office",
                "fraud_score": registry_score,
                "reasons": fraud_result.get("reasons", []),
                "application_id": app_id,
                "customer_id": cust_id
            }

    # 3. Create Valid Loan Application Record
    app_record = LoanApplication(
        application_id=app_id,
        customer_id=cust_id,
        income=income_val,
        employment_length_years=emp_len_val,
        debt=debt_val,
        credit_score=credit_score_val,
        loan_amount=loan_amt_val,
        loan_purpose=purpose_val,
        home_ownership=ownership_val,
        previous_default=prev_default_val,
        status="SUBMITTED"
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)

    # 4. Optional Automatic Credit Scoring (if model is ready)
    try:
        prediction_res = prediction_service.predict_application(db, app_id)
        prob = prediction_res.get("default_prob", 0.5)
        if prob < 0.30:
            app_record.status = "APPROVED"
        elif prob <= 0.60:
            app_record.status = "VERIFICATION_REQUIRED"
        else:
            app_record.status = "REJECTED"
        db.commit()
        db.refresh(app_record)
        head_office_client.patch_application_status(app_id, app_record.status, f"Scored default probability: {prob:.4f}")
    except (DatasetBlockerException, Exception):
        head_office_client.patch_application_status(app_id, "SUBMITTED", "Application registered at Bank B")

    emp_name = current_employee.username if current_employee else "Customer Portal / Self"
    logger.info("Loan application %s created for customer %s by %s", app_id, cust_id, emp_name)
    return app_record

@router.get("", response_model=List[LoanApplicationResponse])
def list_loan_applications(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by application status"),
    search: Optional[str] = Query(None, description="Search term for application_id, customer_id, customer name"),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    query = db.query(LoanApplication).outerjoin(Customer, LoanApplication.customer_id == Customer.customer_id)
    
    if status_filter:
        s_upper = status_filter.strip().upper()
        if s_upper not in VALID_APPLICATION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "VALIDATION_ERROR", "message": f"Invalid status filter '{status_filter}'."}
            )
        query = query.filter(LoanApplication.status == s_upper)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                LoanApplication.application_id.ilike(search_term),
                LoanApplication.customer_id.ilike(search_term),
                Customer.name.ilike(search_term)
            )
        )

    return query.order_by(LoanApplication.created_at.desc()).all()

@router.get("/{application_id}")
def get_loan_application_details(
    application_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application '{application_id}' was not found."}
        )

    customer = db.query(Customer).filter(Customer.customer_id == app_record.customer_id).first()
    predictions = db.query(Prediction).filter(Prediction.application_id == application_id).order_by(Prediction.created_at.desc()).all()

    return {
        "application": LoanApplicationResponse.model_validate(app_record),
        "customer": {
            "customer_id": customer.customer_id,
            "name": customer.name,
            "age": customer.age,
            "gender": customer.gender,
            "phone": customer.phone,
            "address": customer.address,
            "occupation": customer.occupation,
            "employment_type": customer.employment_type
        } if customer else None,
        "predictions": predictions
    }

@router.patch("/{application_id}/status", response_model=LoanApplicationResponse)
def update_application_status(
    application_id: str,
    payload: LoanApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application '{application_id}' was not found."}
        )

    target_status = payload.status.strip().upper()
    # Map officer_decision ON_HOLD to VERIFICATION_REQUIRED if applicable
    if target_status == "ON_HOLD":
        target_status = "VERIFICATION_REQUIRED"

    if target_status not in VALID_APPLICATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": f"Invalid target status '{payload.status}'."}
        )

    current_status = app_record.status
    if target_status != current_status:
        allowed = ALLOWED_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": f"Invalid application status transition from '{current_status}' to '{target_status}'.",
                    "details": {"current_status": current_status, "target_status": target_status, "allowed_transitions": sorted(list(allowed))}
                }
            )

    app_record.status = target_status
    app_record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app_record)

    # Sync updated status to Head Office central application index
    head_office_client.patch_application_status(
        application_id=application_id,
        status=target_status,
        message=payload.message or f"Status updated to {target_status} by Bank B officer {current_employee.username}"
    )

    logger.info("Application %s status updated from %s to %s by employee %s", application_id, current_status, target_status, current_employee.username)
    return app_record

@router.get("/{application_id}/predictions")
def get_application_predictions(
    application_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application '{application_id}' was not found."}
        )

    predictions = db.query(Prediction).filter(Prediction.application_id == application_id).all()
    return {"application_id": application_id, "predictions": predictions}
