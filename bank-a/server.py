# bank-a/server.py
# Bank A Branch FastAPI Node (:8001) - Conforms to FEDCREDIT System Specification v2.0

import os
import sqlite3
import logging
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from crypto_utils import generate_protected_id, verify_identity_biometric_binding
from head_office_client import (
    check_fraud_registry, flag_fraud_at_head_office,
    patch_application_status, download_latest_global_model
)
from model_scorer import score_credit_risk

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [BankA] %(message)s")
logger = logging.getLogger("bank_a.node")

app = FastAPI(title="FedCredit Bank A Branch Node (HDFC)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bank_a.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS customer_kyc_bindings (
            aadhaar_hash TEXT PRIMARY KEY,
            protected_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    return conn

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "bank_id": "BANK_A",
        "bank_name": "HDFC Retail Bank",
        "version": "1.0.0"
    }

@app.post("/api/applications")
async def receive_loan_application(
    application_id: str = Form(...),
    name: str = Form(...),
    pan: str = Form(...),
    aadhaar: str = Form(...),
    age: float = Form(...),
    annual_income: float = Form(...),
    employment_length_years: float = Form(...),
    loan_amount: float = Form(...),
    credit_history_length_years: float = Form(...),
    previous_default: int = Form(...),
    home_ownership: str = Form(...),
    loan_purpose: str = Form(...),
    biometric_file: UploadFile = File(...)
):
    # 1. Read biometric image bytes and generate 64-char HMAC-SHA256 token
    bio_bytes = await biometric_file.read()
    if len(bio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Corrupted biometric file")

    protected_id = generate_protected_id(bio_bytes)
    del bio_bytes  # Immediately discard raw biometric from memory

    # 2. Check Aadhaar-Biometric binding (Catch Identity Mismatch)
    db = get_db()
    if not verify_identity_biometric_binding(db, aadhaar, protected_id):
        # Mismatch detected: Someone entered Alice's Aadhaar with Bob's biometric!
        logger.warning(f"Synthetic identity mismatch detected for application {application_id}")
        flag_fraud_at_head_office(protected_id, application_id, "Synthetic identity: Biometric does not match registered Aadhaar")
        patch_application_status(application_id, "REJECTED", "Rejected: Biometric mismatch against KYC record")
        db.close()
        return {
            "status": "REJECTED",
            "reason": "Biometric mismatch against submitted Aadhaar record",
            "fraud_flagged": True
        }
    db.close()

    # 3. Query Head Office Section 7 Fraud Registry (Cross-Bank Loan Stacking Check)
    try:
        fraud_result = check_fraud_registry(protected_id, application_id)
        fraud_status = fraud_result.get("fraud_status", "SAFE")
        registry_score = fraud_result.get("registry_score", 0)
    except Exception as e:
        logger.warning(f"Could not reach Head Office for fraud check: {e}")
        fraud_status = "SAFE"
        registry_score = 0
        fraud_result = {}

    if fraud_status == "SUSPICIOUS":
        # Cross-Bank Loan Stacking / Syndicate Bust-out detected!
        logger.warning(f"Cross-Bank loan stacking detected for application {application_id}")
        patch_application_status(application_id, "REJECTED", "Rejected: Inter-bank loan stacking detected across consortium")
        return {
            "status": "REJECTED",
            "reason": "Cross-Bank Loan Stacking detected at Head Office",
            "fraud_score": registry_score,
            "reasons": fraud_result.get("reasons", [])
        }

    # 4. Assemble 17-feature vector & evaluate credit risk locally
    # Fetch latest weights from Head Office
    model_data = download_latest_global_model()
    weights = None
    intercept = None
    if model_data and "coef" in model_data and "intercept" in model_data:
        try:
            weights = np.array(model_data["coef"][0], dtype=np.float32)
            intercept = float(model_data["intercept"][0])
        except Exception:
            weights, intercept = None, None

    scoring = score_credit_risk(
        age, annual_income, employment_length_years,
        loan_amount, credit_history_length_years, previous_default,
        home_ownership, loan_purpose,
        weights=weights, intercept=intercept
    )
    decision = scoring["decision"]
    msg = scoring["message"]
    prob_default = scoring["prob_default"]

    # 5. Patch Status to Head Office to notify borrower
    patch_application_status(application_id, decision, msg)

    return {
        "application_id": application_id,
        "status": decision,
        "prob_default": round(prob_default, 4),
        "fraud_status": fraud_status,
        "registry_score": registry_score
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
