"""
Bank B Fraud API Router.
Handles privacy-preserving fraud status checking, manual employee flagging,
and Head Office fraud registry synchronization.
"""
import base64
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Employee, LoanApplication, FraudFlag
from backend.dependencies import get_current_employee
from backend.utils.fraud import generate_protected_id

from backend.services.head_office import HeadOfficeFraudClient, HeadOfficeUnavailableException
from backend.config import logger

router = APIRouter(prefix="/api/fraud", tags=["Fraud"])
head_office_client = HeadOfficeFraudClient()


class FraudCheckRequest(BaseModel):
    application_id: str
    fingerprint_image_base64: Optional[str] = None
    protected_id: Optional[str] = None


class FraudFlagRequest(BaseModel):
    application_id: str
    reason: str = Field(..., min_length=3, description="Reason for manual fraud flagging")
    protected_id: Optional[str] = None


@router.post("/check", response_model=Dict[str, Any])
def check_application_fraud(
    req: FraudCheckRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Checks fraud status for a loan application.
    Generates 64-char protected_id via HMAC-SHA256 from fingerprint bytes if provided.
    Queries local DB flags and Head Office fraud registry.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == req.application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application '{req.application_id}' not found."}
        )

    # Derive protected_id
    protected_id = req.protected_id
    if not protected_id and req.fingerprint_image_base64:
        try:
            fp_bytes = base64.b64decode(req.fingerprint_image_base64)
            protected_id = generate_protected_id(fp_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "VALIDATION_ERROR", "message": f"Invalid fingerprint base64 payload: {str(e)}"}
            )

    if not protected_id:
        # Generate deterministic dummy protected_id from application_id string bytes for lookup
        protected_id = generate_protected_id(req.application_id.encode("utf-8"))

    # Check local flags in DB
    local_flags = db.query(FraudFlag).filter(
        (FraudFlag.application_id == req.application_id) | (FraudFlag.protected_id == protected_id)
    ).all()

    # Try querying Head Office
    try:
        ho_res = head_office_client.check_fraud(protected_id=protected_id, application_id=req.application_id)
        fraud_status = ho_res.get("fraud_status", "SAFE")
        if local_flags and fraud_status == "SAFE":
            fraud_status = "REVIEW_NEEDED"

        return {
            "application_id": req.application_id,
            "protected_id": protected_id,
            "fraud_status": fraud_status,
            "registry_score": ho_res.get("registry_score", 0.0),
            "reasons": ho_res.get("reasons", []) + [f.reason for f in local_flags],
            "head_office_status": "CONNECTED"
        }
    except HeadOfficeUnavailableException as exc:
        if local_flags:
            return {
                "application_id": req.application_id,
                "protected_id": protected_id,
                "fraud_status": "REVIEW_NEEDED",
                "reasons": [f.reason for f in local_flags],
                "head_office_status": "UNAVAILABLE",
                "message": "Local fraud flag found; Head Office registry server is offline."
            }
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "HEAD_OFFICE_UNAVAILABLE",
                "message": str(exc),
                "details": {"protected_id": protected_id}
            }
        )



@router.post("/flag", response_model=Dict[str, Any])
def flag_application_fraud(
    req: FraudFlagRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Allows authenticated Bank B officers to manually flag a loan application for fraud review.
    Persists flag in `fraud_flags` DB table and attempts sync with Head Office.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == req.application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Loan application '{req.application_id}' not found."}}
        )

    protected_id = req.protected_id or generate_protected_id(req.application_id.encode("utf-8"))

    # Create local fraud flag record in DB
    flag_record = FraudFlag(
        application_id=req.application_id,
        protected_id=protected_id,
        reason=req.reason
    )
    db.add(flag_record)
    db.commit()
    db.refresh(flag_record)

    logger.info("Bank officer %s manually flagged application %s for fraud: %s", current_user.username, req.application_id, req.reason)

    # Attempt reporting flag to Head Office
    ho_synced = False
    try:
        head_office_client.flag_fraud(protected_id=protected_id, application_id=req.application_id, reason=req.reason)
        ho_synced = True
    except HeadOfficeUnavailableException:
        logger.info("Head Office server offline; saved fraud flag locally.")

    return {
        "status": "ok",
        "flag_id": flag_record.id,
        "application_id": req.application_id,
        "protected_id": protected_id,
        "reason": req.reason,
        "head_office_synced": ho_synced,
        "message": "Application manually flagged for fraud review."
    }


@router.get("/status/{application_id}", response_model=Dict[str, Any])
def get_application_fraud_status(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Returns existing fraud flags and status for a given loan application ID.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Loan application '{application_id}' not found."}}
        )

    flags = db.query(FraudFlag).filter(FraudFlag.application_id == application_id).all()
    protected_id = generate_protected_id(application_id.encode("utf-8"))

    fraud_status = "REVIEW_NEEDED" if len(flags) > 0 else "SAFE"
    reasons = [f.reason for f in flags]

    return {
        "application_id": application_id,
        "protected_id": protected_id,
        "fraud_status": fraud_status,
        "flag_count": len(flags),
        "reasons": reasons
    }
