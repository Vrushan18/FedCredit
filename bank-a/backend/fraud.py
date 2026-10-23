"""
Fraud Detection Engine for Bank A
Conforms strictly to FedCredit Team Contract Section 7 (FROZEN):
- Bank-side protected_id generation: HMAC-SHA256(FRAUD_SECRET, fingerprint_bytes)
- Local additive score calculation (capped at 100)
- Merges Head Office registry score with local score: score = max(registry_score, local_score)
- Fraud Status: 0-30 SAFE, 31-60 REVIEW_NEEDED, 61-100 SUSPICIOUS
"""

import hmac
import hashlib
import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models import LoanApplication, FraudFlag

def generate_protected_id(fingerprint_bytes: bytes) -> str:
    """Generates 64-char lowercase hex HMAC-SHA256 hash using FRAUD_SECRET."""
    secret = settings.FRAUD_SECRET.encode("utf-8")
    return hmac.new(secret, fingerprint_bytes, hashlib.sha256).hexdigest().lower()

def compute_local_fraud_score(
    db: Session,
    application: LoanApplication,
    protected_id: str
) -> Tuple[int, List[str]]:
    """
    Computes local bank fraud score (additive, capped at 100):
    - loan_percent_income > 0.5: +20
    - existing_debt / annual_income > 0.6: +20
    - Same protected_id applied here >= 2 times in 30 days: +20
    - Manual officer flag on this applicant: +30
    """
    score = 0
    reasons: List[str] = []

    annual_income = application.annual_income
    loan_amount = application.loan_amount
    existing_debt = application.existing_debt

    # Rule 1: loan_percent_income > 0.5 (+20)
    if annual_income > 0 and (loan_amount / annual_income) > 0.5:
        score += 20
        reasons.append("Loan requested exceeds 50% of annual income")

    # Rule 2: existing_debt / annual_income > 0.6 (+20)
    if annual_income > 0 and (existing_debt / annual_income) > 0.6:
        score += 20
        reasons.append("Existing debt ratio exceeds 60% of annual income")

    # Rule 3: Same protected_id applied here >= 2 times in 30 days (+20)
    if protected_id:
        thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        recent_count = db.query(LoanApplication).filter(
            LoanApplication.protected_id == protected_id,
            LoanApplication.created_at >= thirty_days_ago
        ).count()
        if recent_count >= 2:
            score += 20
            reasons.append("Multiple loan applications from this identity within 30 days")

    # Rule 4: Manual officer flag on this applicant (+30)
    has_flag = False
    if protected_id:
        has_flag = db.query(FraudFlag).filter(FraudFlag.protected_id == protected_id).first() is not None
    if not has_flag and application.customer_id:
        has_flag = db.query(FraudFlag).filter(FraudFlag.application_id == application.application_id).first() is not None

    if has_flag:
        score += 30
        reasons.append("Manual officer flag present on this applicant")

    score = min(score, 100)
    return score, reasons

def merge_fraud_results(
    registry_score: int,
    registry_reasons: List[str],
    local_score: int,
    local_reasons: List[str]
) -> Dict[str, Any]:
    """
    Final score = max(registry_score, local_score)
    0-30 -> SAFE
    31-60 -> REVIEW_NEEDED
    61-100 -> SUSPICIOUS
    """
    final_score = max(int(registry_score), int(local_score))
    final_score = min(max(final_score, 0), 100)

    if final_score <= 30:
        status = "SAFE"
    elif final_score <= 60:
        status = "REVIEW_NEEDED"
    else:
        status = "SUSPICIOUS"

    # Merge reasons uniquely while preserving order
    seen = set()
    merged_reasons = []
    for r in (registry_reasons or []) + (local_reasons or []):
        if r and r not in seen:
            seen.add(r)
            merged_reasons.append(r)

    return {
        "score": final_score,
        "status": status,
        "reasons": merged_reasons
    }
