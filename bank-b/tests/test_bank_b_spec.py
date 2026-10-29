"""
Bank B Specification & Consortium Cross-Verification Conformance Test Suite.
Verifies:
1. Deterministic salted Aadhaar hashing (KYC_SALT).
2. Aadhaar-to-biometric KYC binding and synthetic identity mismatch detection.
3. Application submission with biometric file processing and HMAC protected_id generation.
4. Automatic rejection on synthetic identity mismatch.
5. Head Office status patching and latest global model retrieval client methods.
"""
import sys
import os
import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.database import engine, Base, SessionLocal
from database.seed import seed_database
from backend.models import CustomerKycBinding, LoanApplication, FraudFlag
from backend.utils.fraud import (
    generate_protected_id,
    compute_aadhaar_hash,
    verify_identity_biometric_binding
)
from backend.services.head_office import HeadOfficeFraudClient
from backend.auth import create_employee_access_token

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)
    seed_database()

def get_auth_header():
    token = create_employee_access_token({"sub": "admin_b", "role": "OFFICER"})
    return {"Authorization": f"Bearer {token}"}

def test_compute_aadhaar_hash():
    """Verify salted SHA-256 hash formatting and whitespace normalization."""
    aadhaar_raw = "1234 5678 9012"
    h1 = compute_aadhaar_hash(aadhaar_raw)
    h2 = compute_aadhaar_hash("123456789012")
    
    assert len(h1) == 64
    assert h1 == h2
    assert all(c in "0123456789abcdef" for c in h1)

def test_aadhaar_biometric_binding_lifecycle():
    """Verify first-time binding, idempotent repeat binding, and mismatch interception."""
    db = SessionLocal()
    try:
        aadhaar = "999988887777"
        bio1 = b"biometric_fingerprint_minutiae_data_alice_test" * 25
        bio2 = b"biometric_fingerprint_minutiae_data_bob_test" * 25
        
        pid1 = generate_protected_id(bio1)
        pid2 = generate_protected_id(bio2)
        assert pid1 != pid2

        # 1. First time seen: binds successfully
        res1 = verify_identity_biometric_binding(db, aadhaar, pid1)
        assert res1 is True

        # 2. Same Aadhaar with SAME biometric: valid
        res2 = verify_identity_biometric_binding(db, aadhaar, pid1)
        assert res2 is True

        # 3. Same Aadhaar with DIFFERENT biometric: SYNTHETIC FRAUD MISMATCH
        res3 = verify_identity_biometric_binding(db, aadhaar, pid2)
        assert res3 is False
    finally:
        db.close()

def test_application_submission_with_biometric_file_mismatch():
    """Verify that an application with an Aadhaar mismatch is immediately REJECTED and flagged."""
    headers = get_auth_header()
    aadhaar = "888877776666"
    db = SessionLocal()
    try:
        # Pre-bind aadhaar with alice's fingerprint
        alice_bio = b"alice_genuine_fingerprint_sample_minutiae_2026" * 30
        alice_pid = generate_protected_id(alice_bio)
        verify_identity_biometric_binding(db, aadhaar, alice_pid)
    finally:
        db.close()

    # Now attempt submitting an application with Bob's fingerprint for Alice's Aadhaar
    bob_bio = b"bob_fraudulent_fingerprint_minutiae_bytes_2026" * 30
    files = {
        "biometric_file": ("fingerprint.png", io.BytesIO(bob_bio), "image/png")
    }
    data = {
        "customer_id": "CUST-TEST-001",
        "name": "Alice Inconsistent",
        "aadhaar": aadhaar,
        "pan": "ABCPE1234F",
        "annual_income": "600000",
        "employment_length_years": "4",
        "loan_amount": "200000",
        "home_ownership": "OWN",
        "loan_purpose": "PERSONAL",
        "previous_default": "0"
    }

    res = client.post("/api/applications", data=data, files=files, headers=headers)
    assert res.status_code == 201
    resp_data = res.json()
    assert resp_data["status"] == "REJECTED"
    assert resp_data.get("fraud_flagged") is True
    assert "Biometric mismatch" in resp_data.get("reason", "")

def test_head_office_client_methods():
    """Verify patch_application_status and download_latest_global_model."""
    ho_client = HeadOfficeFraudClient()
    
    with patch("requests.patch") as mock_patch:
        mock_patch.return_value.status_code = 200
        mock_patch.return_value.json.return_value = {"status": "ok", "new_status": "APPROVED"}
        
        res = ho_client.patch_application_status("APP-2026-000001", "APPROVED", "Approved by officer")
        assert res.get("status") == "ok"
        mock_patch.assert_called_once()

    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "model_version": 1,
            "coef": [[0.1] * 17],
            "intercept": [-0.5]
        }
        
        model_data = ho_client.download_latest_global_model()
        assert "coef" in model_data
        assert len(model_data["coef"][0]) == 17
