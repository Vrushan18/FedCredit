"""
Bank A FastAPI Server (Port 8001)
Conforms strictly to FedCredit Team Contract Section 5, 6, 7 & 8:
- Inbound from Customer Portal: POST /api/applications, GET /api/health
- Employee Portal endpoints: Auth, Customers CRUD, Loan Applications Queue, Predict with SHAP, Decision, Flag, FL Telemetry
- Heartbeat & sync retry queue background service
- Standard Error Envelope on all errors
"""

import os
import sys
import json
import logging
import asyncio
import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
)
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

# Add Bank-A root to path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from backend.config import settings
from backend.database import Base, engine, get_db, SessionLocal
from backend.models import (
    Employee, Customer, LoanApplication, ApplicationDocument,
    Prediction, LocalTrainingLog, FraudFlag, SyncQueueItem
)
from backend.schemas import (
    ApplicationStatus, OfficerDecision, RiskLevel, FraudStatus, Recommendation,
    CanonicalApplicationPayload, ErrorEnvelope, ErrorDetail,
    PredictResponse, ShapFactor, FraudSummary,
    DecisionRequest, DecisionResponse, FlagRequest, FlagResponse,
    LoginRequest, TokenResponse, EmployeeOut,
    CustomerCreate, CustomerUpdate, CustomerOut, DashboardStats
)
from backend.auth import (
    verify_password, get_password_hash, create_employee_token,
    get_current_employee, verify_customer_jwt
)
from backend.fraud import generate_protected_id, compute_local_fraud_score, merge_fraud_results
from backend.head_office_client import head_office
from ml.model import CreditRiskModel
from ml.shap_explainer import ShapExplainer

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [BankA] %(message)s")
logger = logging.getLogger("bank_a.server")

# Global instances
ml_model: Optional[CreditRiskModel] = None
shap_explainer: Optional[ShapExplainer] = None
last_heartbeat_time: Optional[datetime.datetime] = None

def init_ml_engine():
    global ml_model, shap_explainer
    if ml_model is None:
        preprocessing_file = os.path.join(ROOT_DIR, "preprocessing.json")
        ml_model = CreditRiskModel(preprocessing_path=preprocessing_file)
        
        # Load existing or train local model baseline
        model_weights_path = os.path.join(ROOT_DIR, "models", "global_model.json")
        if os.path.exists(model_weights_path):
            ml_model.load_weights(model_weights_path)
            logger.info(f"Loaded existing model weights from {model_weights_path}")
        else:
            train_path = os.path.join(ROOT_DIR, "data", "bank_a_train.json")
            if os.path.exists(train_path):
                ml_model.train_local(train_path)
                ml_model.save_weights(model_weights_path)
                logger.info("Initialized baseline model from local dataset")
        shap_explainer = ShapExplainer(ml_model)
    return ml_model, shap_explainer

# Background Heartbeat and Retry Queue Task
async def heartbeat_and_sync_worker():
    global last_heartbeat_time
    logger.info("Starting Bank A background heartbeat & sync retry worker...")
    local_base_url = f"http://{settings.BANK_A_IP}:{settings.BANK_API_PORT}/api"
    
    while True:
        try:
            # 1. Send Heartbeat
            success = await head_office.send_heartbeat(local_base_url)
            if success:
                last_heartbeat_time = datetime.datetime.utcnow()
                logger.debug("Heartbeat successfully sent to Head Office")
                
                # 2. Flush pending status pushes in sync queue
                db = SessionLocal()
                try:
                    pending_items = db.query(SyncQueueItem).filter(SyncQueueItem.status == "PENDING").all()
                    for item in pending_items:
                        pushed = await head_office.push_status(item.application_id, item.target_status, item.message)
                        item.attempts += 1
                        item.last_attempt = datetime.datetime.utcnow()
                        if pushed:
                            item.status = "SUCCESS"
                        elif item.attempts >= 5:
                            item.status = "FAILED"
                    if pending_items:
                        db.commit()
                except Exception as ex:
                    logger.debug(f"Sync queue error: {ex}")
                finally:
                    db.close()
        except Exception as e:
            logger.debug(f"Heartbeat loop exception: {e}")
            
        await asyncio.sleep(30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")
    
    # Initialize ML Model & Preprocessing
    init_ml_engine()
    
    # Start background task
    worker_task = asyncio.create_task(heartbeat_and_sync_worker())
    yield
    worker_task.cancel()

app = FastAPI(
    title="Bank A (HDFC Retail Bank) API Node",
    description="Federated Credit Risk System - Bank A Local Node API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = [
    settings.PORTAL_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.exceptions import HTTPException as StarletteHTTPException

# Standard Error Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    
    code_map = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHENTICATED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        500: "SERVER_ERROR"
    }
    code = code_map.get(exc.status_code, "SERVER_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": str(exc.detail),
                "details": {}
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request payload validation failed",
                "details": {"errors": exc.errors()}
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "SERVER_ERROR",
                "message": f"An unexpected server error occurred: {str(exc)}",
                "details": {}
            }
        }
    )

# ==========================================
# INBOUND APIS (From Portal / Public)
# ==========================================

@app.get("/health")
@app.get("/api/health")
def get_health():
    """Health check endpoint conforming to frozen contract."""
    return {
        "status": "ok",
        "bank_id": settings.BANK_ID,
        "bank_name": settings.BANK_NAME,
        "version": "1.0.0",
        "last_sync": last_heartbeat_time.isoformat() if last_heartbeat_time else None
    }

@app.post("/applications", status_code=status.HTTP_201_CREATED)
@app.post("/api/applications", status_code=status.HTTP_201_CREATED)
async def submit_application(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Inbound endpoint from Customer Portal:
    - Accepts both multipart/form-data and application/json
    - Auth: Customer JWT in Authorization header verified with shared CUSTOMER_JWT_SECRET
    - Confirms token customer_id matches data.customer_id
    - Hashes fingerprint image into protected_id via HMAC-SHA256 and DISCARDS image immediately
    - Stores KYC documents to disk/DB
    - Idempotent on application_id
    """
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    content_type = request.headers.get("content-type", "")
    raw_json = None
    fp_bytes = None
    doc_uploads = []

    try:
        if "application/json" in content_type:
            raw_json = await request.json()
        elif "multipart/form-data" in content_type:
            form = await request.form()
            data_val = form.get("data")
            if data_val:
                raw_json = json.loads(data_val) if isinstance(data_val, str) else json.loads(await data_val.read())
            else:
                # Fallback if fields passed directly
                raw_json = dict(form)

            fp_val = form.get("biometric_file") or form.get("fingerprint")
            if fp_val and hasattr(fp_val, "read"):
                fp_bytes = await fp_val.read()

            for item in form.getlist("documents"):
                if hasattr(item, "read") and getattr(item, "filename", None):
                    doc_uploads.append(item)
        else:
            # Fallback to json attempt
            raw_json = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": f"Could not parse application request: {str(e)}", "details": {}}
        )

    if not raw_json:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": "Missing application payload", "details": {}}
        )

    # Transform flat form fields into canonical structure if submitted directly from Customer Portal
    if isinstance(raw_json, dict) and "applicant" not in raw_json and ("name" in raw_json or "annual_income" in raw_json):
        app_id_val = str(raw_json.get("application_id", "APP-2026-000001"))
        cust_id_val = str(raw_json.get("customer_id", "")) or (f"CUST-{app_id_val[-6:]}" if len(app_id_val) >= 6 else "CUST-DEFAULT")
        raw_json = {
            "application_id": app_id_val,
            "customer_id": cust_id_val,
            "applicant": {
                "full_name": raw_json.get("name") or raw_json.get("full_name") or "Applicant",
                "age": int(float(raw_json.get("age", 30))),
                "gender": str(raw_json.get("gender", "MALE")).upper(),
                "address": raw_json.get("address", "Mumbai, Maharashtra"),
                "phone": raw_json.get("phone", "+91 9999999999"),
                "occupation": raw_json.get("occupation", "Professional"),
                "employment_type": str(raw_json.get("employment_type", "SALARIED")).upper(),
                "pan": raw_json.get("pan"),
                "aadhaar": raw_json.get("aadhaar")
            },
            "financial": {
                "annual_income": float(raw_json.get("annual_income", 500000)),
                "existing_debt": float(raw_json.get("existing_debt", 0)),
                "credit_score": int(float(raw_json.get("credit_score", 700))),
                "home_ownership": str(raw_json.get("home_ownership", "RENT")).upper(),
                "employment_length_years": float(raw_json.get("employment_length_years", 3.0)),
                "credit_history_length_years": float(raw_json.get("credit_history_length_years", 5.0)),
                "previous_default": bool(int(raw_json.get("previous_default", 0)))
            },
            "loan": {
                "amount": float(raw_json.get("loan_amount") or raw_json.get("amount", 100000)),
                "duration_months": int(float(raw_json.get("duration_months", 24))),
                "purpose": str(raw_json.get("loan_purpose") or raw_json.get("purpose", "PERSONAL")).upper()
            }
        }

    # Validate against canonical schema
    try:
        payload = CanonicalApplicationPayload(**raw_json)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": f"Invalid application data: {str(e)}", "details": {}}
        )

    # Verify Customer JWT matches customer_id if token provided
    if token:
        verify_customer_jwt(token, payload.customer_id)
    else:
        logger.warning(f"Application {payload.application_id} received without Customer JWT header")

    # Process Fingerprint for protected_id, then DISCARD image bytes immediately
    protected_id = None
    if fp_bytes:
        protected_id = generate_protected_id(fp_bytes)
        del fp_bytes # Explicitly discard from memory
    else:
        # Default fallback hash based on customer_id + timestamp if no fingerprint uploaded
        dummy_seed = f"{payload.customer_id}_{payload.application_id}".encode("utf-8")
        protected_id = generate_protected_id(dummy_seed)

    # Check Aadhaar-Biometric binding (Catch Identity Mismatch: Alice's Aadhaar with Bob's biometric)
    aadhaar_val = None
    if isinstance(raw_json, dict):
        if raw_json.get("aadhaar"):
            aadhaar_val = str(raw_json["aadhaar"]).strip()
        elif isinstance(raw_json.get("applicant"), dict) and raw_json["applicant"].get("aadhaar"):
            aadhaar_val = str(raw_json["applicant"]["aadhaar"]).strip()

    if aadhaar_val and protected_id:
        from crypto_utils import verify_identity_biometric_binding
        with engine.connect() as connection:
            raw_conn = connection.connection
            is_binding_valid = verify_identity_biometric_binding(raw_conn, aadhaar_val, protected_id)
            if not is_binding_valid:
                logger.warning(f"Synthetic identity mismatch for application {payload.application_id}: Aadhaar {aadhaar_val[:4]}**** already bound to different biometric!")
                from head_office_client import flag_fraud_at_head_office, patch_application_status
                flag_fraud_at_head_office(protected_id, payload.application_id, "Synthetic identity: Biometric does not match registered Aadhaar")
                patch_application_status(payload.application_id, "REJECTED", "Rejected: Biometric mismatch against KYC record")
                return {
                    "application_id": payload.application_id,
                    "status": "REJECTED",
                    "reason": "Biometric mismatch against submitted Aadhaar record",
                    "fraud_flagged": True
                }

    # Query Head Office Section 7 Fraud Registry (Cross-Bank Loan Stacking Check)
    from head_office_client import check_fraud_registry, patch_application_status
    try:
        fraud_result = check_fraud_registry(protected_id, payload.application_id)
        fraud_status_val = fraud_result.get("fraud_status", "SAFE")
        registry_score_val = fraud_result.get("registry_score", 0)
        reasons_val = fraud_result.get("reasons", [])
    except Exception as e:
        logger.warning(f"Could not reach Head Office for fraud check: {e}")
        fraud_status_val = "SAFE"
        registry_score_val = 0
        reasons_val = []

    if fraud_status_val == "SUSPICIOUS":
        logger.warning(f"Cross-Bank loan stacking detected for application {payload.application_id}")
        patch_application_status(payload.application_id, "REJECTED", "Rejected: Inter-bank loan stacking detected across consortium")
        return {
            "application_id": payload.application_id,
            "status": "REJECTED",
            "reason": "Cross-Bank Loan Stacking detected at Head Office",
            "fraud_score": registry_score_val,
            "reasons": reasons_val
        }

    # Idempotency check on application_id
    existing_app = db.query(LoanApplication).filter(LoanApplication.application_id == payload.application_id).first()
    if existing_app:
        logger.info(f"Application {payload.application_id} already exists. Returning current state.")
        return {"application_id": existing_app.application_id, "status": existing_app.status}

    # Upsert Customer KYC in local DB
    customer = db.query(Customer).filter(Customer.customer_id == payload.customer_id).first()
    if not customer:
        customer = Customer(
            customer_id=payload.customer_id,
            name=payload.applicant.full_name,
            age=payload.applicant.age,
            gender=payload.applicant.gender.value,
            address=payload.applicant.address,
            phone=payload.applicant.phone,
            occupation=payload.applicant.occupation,
            employment_type=payload.applicant.employment_type.value
        )
        db.add(customer)
    else:
        customer.name = payload.applicant.full_name
        customer.age = payload.applicant.age
        customer.gender = payload.applicant.gender.value
        customer.address = payload.applicant.address
        customer.phone = payload.applicant.phone
        customer.occupation = payload.applicant.occupation
        customer.employment_type = payload.applicant.employment_type.value

    # Create LoanApplication record
    loan_app = LoanApplication(
        application_id=payload.application_id,
        customer_id=payload.customer_id,
        annual_income=payload.financial.annual_income,
        existing_debt=payload.financial.existing_debt,
        credit_score=payload.financial.credit_score,
        home_ownership=payload.financial.home_ownership.value,
        employment_length_years=payload.financial.employment_length_years,
        credit_history_length_years=payload.financial.credit_history_length_years,
        previous_default=payload.financial.previous_default,
        loan_amount=payload.loan.amount,
        duration_months=payload.loan.duration_months,
        purpose=payload.loan.purpose.value,
        applicant_name=payload.applicant.full_name,
        applicant_age=payload.applicant.age,
        applicant_gender=payload.applicant.gender.value,
        applicant_address=payload.applicant.address,
        applicant_phone=payload.applicant.phone,
        applicant_occupation=payload.applicant.occupation,
        applicant_employment_type=payload.applicant.employment_type.value,
        protected_id=protected_id,
        status=ApplicationStatus.SUBMITTED.value,
        raw_payload=raw_json
    )
    db.add(loan_app)

    # Store uploaded supporting documents if any
    uploads_dir = os.path.join(ROOT_DIR, "uploads", payload.application_id)
    os.makedirs(uploads_dir, exist_ok=True)
    for doc in doc_uploads:
        if getattr(doc, "filename", None):
            save_path = os.path.join(uploads_dir, doc.filename)
            content = await doc.read()
            with open(save_path, "wb") as f:
                f.write(content)
            doc_rec = ApplicationDocument(
                application_id=payload.application_id,
                file_path=save_path,
                doc_type="KYC_ATTACHMENT"
            )
            db.add(doc_rec)

    db.commit()
    logger.info(f"Application {payload.application_id} registered successfully for customer {payload.customer_id}")
    return {"application_id": payload.application_id, "status": "SUBMITTED"}

# ==========================================
# EMPLOYEE AUTH & PROFILE APIS
# ==========================================

@app.post("/api/auth/login", response_model=TokenResponse)
def employee_login(req: LoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.username == req.username).first()
    if not employee or not verify_password(req.password, employee.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Invalid employee username or password", "details": {}}
        )
    token = create_employee_token(employee)
    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "username": employee.username,
            "role": employee.role,
            "bank_id": settings.BANK_ID,
            "bank_name": settings.BANK_NAME
        }
    }

@app.get("/api/auth/me")
def employee_profile(current_user: Employee = Depends(get_current_employee)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "bank_id": settings.BANK_ID,
        "bank_name": settings.BANK_NAME
    }

# ==========================================
# CUSTOMER CRUD APIS
# ==========================================

@app.get("/api/customers", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    query = db.query(Customer)
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.customer_id.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%"))
        )
    return query.order_by(Customer.created_at.desc()).all()

@app.post("/api/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    cust: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    existing = db.query(Customer).filter(Customer.customer_id == cust.customer_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT", "message": f"Customer ID {cust.customer_id} already exists", "details": {}}
        )
    new_c = Customer(**cust.model_dump())
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return new_c

@app.get("/api/customers/{customer_id}")
def get_customer_detail(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    cust = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not cust:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Customer {customer_id} not found", "details": {}}
        )
    applications = db.query(LoanApplication).filter(LoanApplication.customer_id == customer_id).all()
    return {
        "customer": CustomerOut.model_validate(cust),
        "applications": [
            {
                "application_id": a.application_id,
                "amount": a.loan_amount,
                "purpose": a.purpose,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in applications
        ]
    }

@app.put("/api/customers/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    update_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    cust = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not cust:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Customer {customer_id} not found", "details": {}}
        )
    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(cust, field, val)
    db.commit()
    db.refresh(cust)
    return cust

@app.delete("/api/customers/{customer_id}")
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    cust = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not cust:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Customer {customer_id} not found", "details": {}}
        )
    db.delete(cust)
    db.commit()
    return {"status": "ok", "message": f"Customer {customer_id} deleted"}

# ==========================================
# LOAN APPLICATIONS QUEUE & DETAIL APIS
# ==========================================

@app.get("/api/loan-applications")
def list_loan_applications(
    status: Optional[str] = Query(None, description="Filter by application status"),
    search: Optional[str] = Query(None, description="Search applicant name or application_id"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    query = db.query(LoanApplication)
    if status:
        query = query.filter(LoanApplication.status == status)
    if search:
        query = query.filter(
            (LoanApplication.application_id.ilike(f"%{search}%")) |
            (LoanApplication.applicant_name.ilike(f"%{search}%")) |
            (LoanApplication.customer_id.ilike(f"%{search}%"))
        )
    apps = query.order_by(LoanApplication.created_at.desc()).all()
    
    result = []
    for a in apps:
        pred = a.prediction
        result.append({
            "application_id": a.application_id,
            "customer_id": a.customer_id,
            "applicant_name": a.applicant_name,
            "applicant_age": a.applicant_age,
            "annual_income": a.annual_income,
            "loan_amount": a.loan_amount,
            "purpose": a.purpose,
            "status": a.status,
            "officer_decision": a.officer_decision,
            "has_prediction": pred is not None,
            "risk_level": pred.risk_level if pred else None,
            "fraud_status": pred.fraud_status if pred else None,
            "recommendation": pred.recommendation if pred else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None
        })
    return result

@app.get("/api/loan-applications/{application_id}")
def get_loan_application_detail(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application {application_id} not found", "details": {}}
        )

    # Documents
    docs = db.query(ApplicationDocument).filter(ApplicationDocument.application_id == application_id).all()
    doc_list = [{"id": d.id, "file_path": d.file_path, "doc_type": d.doc_type, "uploaded_at": d.uploaded_at.isoformat()} for d in docs]

    # Fraud flags
    flags = db.query(FraudFlag).filter(FraudFlag.application_id == application_id).all()
    flag_list = [{"id": f.id, "reason": f.reason, "flagged_at": f.flagged_at.isoformat()} for f in flags]

    # Prediction detail
    pred_data = None
    if app_record.prediction:
        p = app_record.prediction
        pred_data = {
            "risk_level": p.risk_level,
            "default_probability": p.default_prob,
            "confidence": p.confidence,
            "recommendation": p.recommendation,
            "explanation": p.shap_values,
            "fraud": {
                "status": p.fraud_status,
                "score": p.fraud_score,
                "reasons": p.fraud_reasons
            },
            "model_version": p.model_version,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }

    return {
        "application_id": app_record.application_id,
        "customer_id": app_record.customer_id,
        "applicant": {
            "full_name": app_record.applicant_name,
            "age": app_record.applicant_age,
            "gender": app_record.applicant_gender,
            "address": app_record.applicant_address,
            "phone": app_record.applicant_phone,
            "occupation": app_record.applicant_occupation,
            "employment_type": app_record.applicant_employment_type
        },
        "financial": {
            "annual_income": app_record.annual_income,
            "existing_debt": app_record.existing_debt,
            "credit_score": app_record.credit_score,
            "home_ownership": app_record.home_ownership,
            "employment_length_years": app_record.employment_length_years,
            "credit_history_length_years": app_record.credit_history_length_years,
            "previous_default": app_record.previous_default
        },
        "loan": {
            "amount": app_record.loan_amount,
            "duration_months": app_record.duration_months,
            "purpose": app_record.purpose
        },
        "protected_id": app_record.protected_id,
        "status": app_record.status,
        "officer_decision": app_record.officer_decision,
        "decision_notes": app_record.decision_notes,
        "documents": doc_list,
        "fraud_flags": flag_list,
        "prediction": pred_data,
        "created_at": app_record.created_at.isoformat() if app_record.created_at else None,
        "updated_at": app_record.updated_at.isoformat() if app_record.updated_at else None
    }

# ==========================================
# PREDICTION & XAI API (FROZEN Section 5 & 7)
# ==========================================

@app.post("/api/loan-applications/{application_id}/predict", response_model=PredictResponse)
async def predict_loan_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Runs ML Model + SHAP + Fraud Check according to FROZEN specs:
    1. First predict push UNDER_REVIEW to Head Office.
    2. Check Head Office Fraud Registry with protected_id.
    3. Compute local bank fraud score.
    4. Merge fraud results: max(registry_score, local_score).
    5. Run 17-feature ML model: compute default_probability p.
    6. Compute confidence = max(p, 1-p).
    7. Determine risk level and recommendation:
       - p < 0.25 -> LOW, ELIGIBLE
       - 0.25 <= p <= 0.50 -> MEDIUM, HOLD_FOR_VERIFICATION
       - p > 0.50 -> HIGH, NOT_RECOMMENDED
       - If fraud status is not SAFE, recommendation capped at HOLD_FOR_VERIFICATION (never ELIGIBLE).
    8. Generate top 5 SHAP factors with POSITIVE/NEGATIVE directions and plain English labels.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application {application_id} not found", "details": {}}
        )

    # Rule 3: First predict call pushes UNDER_REVIEW to Head Office
    if app_record.status == ApplicationStatus.SUBMITTED.value:
        app_record.status = ApplicationStatus.UNDER_REVIEW.value
        db.commit()
        # Fire and push status or enqueue for retry
        pushed = await head_office.push_status(application_id, ApplicationStatus.UNDER_REVIEW.value, "Application opened for officer review")
        if not pushed:
            sync_item = SyncQueueItem(
                application_id=application_id,
                target_status=ApplicationStatus.UNDER_REVIEW.value,
                message="Application opened for officer review"
            )
            db.add(sync_item)
            db.commit()

    # 1. Fraud Check: Call Head Office registry
    protected_id = app_record.protected_id or "0" * 64
    registry_res = await head_office.check_fraud(protected_id, application_id)
    reg_score = registry_res.get("registry_score", 0)
    reg_reasons = registry_res.get("reasons", [])

    # 2. Local Fraud Score
    local_score, local_reasons = compute_local_fraud_score(db, app_record, protected_id)

    # 3. Merge Fraud Evaluation
    merged_fraud = merge_fraud_results(reg_score, reg_reasons, local_score, local_reasons)
    fraud_status_enum = FraudStatus(merged_fraud["status"])
    fraud_score_val = merged_fraud["score"]
    merged_reasons = merged_fraud["reasons"]

    # 4. ML Model Inference
    applicant_dict = {
        "age": app_record.applicant_age,
        "occupation": app_record.applicant_occupation,
        "employment_type": app_record.applicant_employment_type
    }
    financial_dict = {
        "annual_income": app_record.annual_income,
        "existing_debt": app_record.existing_debt,
        "credit_score": app_record.credit_score,
        "home_ownership": app_record.home_ownership,
        "employment_length_years": app_record.employment_length_years,
        "credit_history_length_years": app_record.credit_history_length_years,
        "previous_default": app_record.previous_default
    }
    loan_dict = {
        "amount": app_record.loan_amount,
        "duration_months": app_record.duration_months,
        "purpose": app_record.purpose
    }

    model_inst, explainer_inst = init_ml_engine()
    feature_vec = model_inst.transform_single(applicant_dict, financial_dict, loan_dict)
    p = model_inst.predict_default_prob(feature_vec)
    confidence = round(float(max(p, 1.0 - p)), 2)
    default_prob = round(float(p), 2)

    # Rule 1: Risk from default probability
    if p < 0.25:
        risk_level = RiskLevel.LOW
        initial_recommendation = Recommendation.ELIGIBLE
    elif p <= 0.50:
        risk_level = RiskLevel.MEDIUM
        initial_recommendation = Recommendation.HOLD_FOR_VERIFICATION
    else:
        risk_level = RiskLevel.HIGH
        initial_recommendation = Recommendation.NOT_RECOMMENDED

    # Rule 2: If fraud status is not SAFE, recommendation capped at HOLD_FOR_VERIFICATION (never ELIGIBLE)
    final_recommendation = initial_recommendation
    if fraud_status_enum != FraudStatus.SAFE and initial_recommendation == Recommendation.ELIGIBLE:
        final_recommendation = Recommendation.HOLD_FOR_VERIFICATION
        logger.info(f"Fraud status {fraud_status_enum} downgraded recommendation from ELIGIBLE to HOLD_FOR_VERIFICATION")

    # 5. Explainable AI: SHAP Explanations
    raw_payload_info = {
        "applicant": applicant_dict,
        "financial": financial_dict,
        "loan": loan_dict
    }
    shap_factors = explainer_inst.explain(feature_vec, raw_payload_info)

    # Save or update Prediction in DB
    existing_pred = db.query(Prediction).filter(Prediction.application_id == application_id).first()
    if not existing_pred:
        existing_pred = Prediction(
            application_id=application_id,
            risk_level=risk_level.value,
            default_prob=default_prob,
            confidence=confidence,
            recommendation=final_recommendation.value,
            shap_values=shap_factors,
            fraud_score=fraud_score_val,
            fraud_status=fraud_status_enum.value,
            fraud_reasons=merged_reasons,
            model_version=model_inst.model_version
        )
        db.add(existing_pred)
    else:
        existing_pred.risk_level = risk_level.value
        existing_pred.default_prob = default_prob
        existing_pred.confidence = confidence
        existing_pred.recommendation = final_recommendation.value
        existing_pred.shap_values = shap_factors
        existing_pred.fraud_score = fraud_score_val
        existing_pred.fraud_status = fraud_status_enum.value
        existing_pred.fraud_reasons = merged_reasons
        existing_pred.model_version = model_inst.model_version

    db.commit()

    return PredictResponse(
        risk_level=risk_level,
        default_probability=default_prob,
        confidence=confidence,
        recommendation=final_recommendation,
        explanation=[ShapFactor(**f) for f in shap_factors],
        fraud=FraudSummary(
            status=fraud_status_enum,
            score=fraud_score_val,
            reasons=merged_reasons
        ),
        model_version=model_inst.model_version
    )

# ==========================================
# OFFICER DECISION & FRAUD FLAG APIS
# ==========================================

@app.post("/api/loan-applications/{application_id}/decision", response_model=DecisionResponse)
async def record_officer_decision(
    application_id: str,
    req: DecisionRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Officer decision: APPROVED, REJECTED, or ON_HOLD
    Maps to customer status:
    - APPROVED -> APPROVED
    - REJECTED -> REJECTED
    - ON_HOLD -> VERIFICATION_REQUIRED
    Pushes status update to Head Office with resilient retry queue.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application {application_id} not found", "details": {}}
        )

    decision_map = {
        OfficerDecision.APPROVED: ApplicationStatus.APPROVED,
        OfficerDecision.REJECTED: ApplicationStatus.REJECTED,
        OfficerDecision.ON_HOLD: ApplicationStatus.VERIFICATION_REQUIRED
    }
    new_customer_status = decision_map[req.decision]

    app_record.officer_decision = req.decision.value
    app_record.status = new_customer_status.value
    app_record.decision_notes = req.note or ""
    db.commit()

    # Push to Head Office
    msg = f"Officer decision: {req.decision.value}. Note: {req.note or ''}"
    pushed = await head_office.push_status(application_id, new_customer_status.value, msg)
    if not pushed:
        sync_item = SyncQueueItem(
            application_id=application_id,
            target_status=new_customer_status.value,
            message=msg
        )
        db.add(sync_item)
        db.commit()

    return DecisionResponse(
        application_id=application_id,
        decision=req.decision,
        status=new_customer_status,
        message=f"Application decision recorded as {req.decision.value} (Customer Status: {new_customer_status.value})"
    )

@app.post("/api/loan-applications/{application_id}/flag", response_model=FlagResponse)
async def flag_suspicious_application(
    application_id: str,
    req: FlagRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """Submits manual fraud flag to Head Office and stores locally."""
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application {application_id} not found", "details": {}}
        )

    protected_id = app_record.protected_id or "0" * 64
    
    # Save local fraud flag
    flag_rec = FraudFlag(
        protected_id=protected_id,
        application_id=application_id,
        reason=req.reason
    )
    db.add(flag_rec)
    db.commit()

    # Call Head Office
    res = await head_office.flag_fraud(protected_id, application_id, req.reason)
    return FlagResponse(
        protected_id=protected_id,
        application_id=application_id,
        status=res.get("status", "FLAGGED"),
        flag_count=res.get("flag_count", 1)
    )

# ==========================================
# DASHBOARD STATS API
# ==========================================

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    total_customers = db.query(Customer).count()
    pending_loans = db.query(LoanApplication).filter(
        LoanApplication.status.in_([ApplicationStatus.SUBMITTED.value, ApplicationStatus.UNDER_REVIEW.value])
    ).count()
    approved_loans = db.query(LoanApplication).filter(LoanApplication.status == ApplicationStatus.APPROVED.value).count()
    rejected_loans = db.query(LoanApplication).filter(LoanApplication.status == ApplicationStatus.REJECTED.value).count()
    on_hold_loans = db.query(LoanApplication).filter(LoanApplication.status == ApplicationStatus.VERIFICATION_REQUIRED.value).count()

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_apps = db.query(LoanApplication).filter(LoanApplication.created_at >= today_start).count()

    # Latest accuracy from training logs or model
    latest_log = db.query(LocalTrainingLog).order_by(LocalTrainingLog.round.desc()).first()
    local_acc = latest_log.local_accuracy if latest_log else 0.865

    return DashboardStats(
        total_customers=total_customers,
        pending_loans=pending_loans,
        approved_loans=approved_loans,
        rejected_loans=rejected_loans,
        on_hold_loans=on_hold_loans,
        today_applications=today_apps,
        local_model_accuracy=round(float(local_acc), 4),
        last_sync_time=last_heartbeat_time.isoformat() if last_heartbeat_time else None,
        bank_id=settings.BANK_ID,
        bank_name=settings.BANK_NAME
    )

# ==========================================
# LOCAL MODEL & TRAINING APIS
# ==========================================

@app.post("/api/training/local/start")
def start_local_training(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """Triggers local training on Bank A's partition and logs telemetry."""
    train_path = os.path.join(ROOT_DIR, "data", "bank_a_train.json")
    if not os.path.exists(train_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Local training dataset not found at {train_path}", "details": {}}
        )

    model_inst, _ = init_ml_engine()
    metrics = model_inst.train_local(train_path)
    
    # Save model weights locally
    model_save_path = os.path.join(ROOT_DIR, "models", "global_model.json")
    model_inst.save_weights(model_save_path)

    # Determine round number
    last_log = db.query(LocalTrainingLog).order_by(LocalTrainingLog.round.desc()).first()
    next_round = (last_log.round + 1) if last_log else 1

    log_entry = LocalTrainingLog(
        round=next_round,
        local_loss=metrics["loss"],
        local_accuracy=metrics["accuracy"],
        num_samples=metrics["samples"]
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": "success",
        "round": next_round,
        "samples": metrics["samples"],
        "accuracy": metrics["accuracy"],
        "auc": metrics["auc"],
        "loss": metrics["loss"],
        "model_version": ml_model.model_version
    }

@app.get("/api/training/logs")
def get_training_logs(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    logs = db.query(LocalTrainingLog).order_by(LocalTrainingLog.round.desc()).all()
    return [
        {
            "id": l.id,
            "round": l.round,
            "local_loss": l.local_loss,
            "local_accuracy": l.local_accuracy,
            "num_samples": l.num_samples,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        } for l in logs
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.BANK_API_PORT)
