"""
Phase 6 Fraud & Head Office Integration Test Suite.
Verifies 64-char HMAC protected ID generation, employee auth enforcement,
manual fraud flagging DB persistence, 404 handling, Head Office 503 offline response,
and raw biometric data non-persistence security.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import engine, Base, SessionLocal
from database.seed import seed_database
from backend.models import FraudFlag, LoanApplication
from backend.auth import create_employee_access_token
from backend.utils.fraud import generate_protected_id
from backend.services.head_office import HeadOfficeUnavailableException

client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)
    seed_database()


def get_auth_header():
    token = create_employee_access_token({"sub": "admin_b", "role": "OFFICER"})
    return {"Authorization": f"Bearer {token}"}



def test_hmac_protected_id_generation_length_and_determinism():
    """Verify 64-character lowercase hex HMAC-SHA256 generation."""
    sample_bytes = b"sample_fingerprint_minutiae_data_2026"
    pid1 = generate_protected_id(sample_bytes, secret="secret1")

    assert len(pid1) == 64
    assert pid1 == pid1.lower()
    assert all(c in "0123456789abcdef" for c in pid1)

    # Determinism check
    pid2 = generate_protected_id(sample_bytes, secret="secret1")
    assert pid1 == pid2

    # Secret dependence
    pid_diff_secret = generate_protected_id(sample_bytes, secret="secret2")
    assert pid1 != pid_diff_secret

    # Empty bytes raises ValueError
    with pytest.raises(ValueError):
        generate_protected_id(b"")


def test_unauthenticated_fraud_requests_rejected():
    """Verify missing JWT returns 401 UNAUTHORIZED."""
    res_check = client.post("/api/fraud/check", json={"application_id": "APP-2026-000001"})
    assert res_check.status_code == 401

    res_flag = client.post("/api/fraud/flag", json={"application_id": "APP-2026-000001", "reason": "Test"})
    assert res_flag.status_code == 401


def test_manual_fraud_flagging_persists_in_database():
    """Verify authenticated officer manual flagging creates DB record in fraud_flags."""
    headers = get_auth_header()

    # Create fresh application first
    create_res = client.post("/api/applications", json={
        "customer_id": "CUST-000001",
        "income": 500000.0,
        "employment_length_years": 2.0,
        "debt": 10000.0,
        "credit_score": 680,
        "loan_amount": 100000.0,
        "loan_purpose": "PERSONAL",
        "home_ownership": "RENT",
        "previous_default": 0
    }, headers=headers)
    assert create_res.status_code == 201
    app_id = create_res.json()["application_id"]

    flag_payload = {
        "application_id": app_id,
        "reason": "Suspicious identity document inconsistency"
    }

    res = client.post("/api/fraud/flag", json=flag_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["application_id"] == app_id
    assert len(data["protected_id"]) == 64

    # Query DB directly to verify persistence
    db = SessionLocal()
    try:
        flag_rec = db.query(FraudFlag).filter(FraudFlag.application_id == app_id).first()
        assert flag_rec is not None
        assert flag_rec.reason == "Suspicious identity document inconsistency"
        assert len(flag_rec.protected_id) == 64
    finally:
        db.close()


def test_fraud_flagging_nonexistent_application_returns_404():
    """Verify manual flagging on invalid application ID returns 404 NOT_FOUND."""
    headers = get_auth_header()
    res = client.post("/api/fraud/flag", json={
        "application_id": "APP-9999-999999",
        "reason": "Nonexistent application flag"
    }, headers=headers)

    assert res.status_code == 404
    data = res.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_head_office_unavailability_returns_503_or_local_status():
    """Verify that when Head Office is offline, check endpoint returns 503 HEAD_OFFICE_UNAVAILABLE without fake status."""
    headers = get_auth_header()

    # Create fresh unflagged application
    create_res = client.post("/api/applications", json={
        "customer_id": "CUST-000001",

        "income": 600000.0,
        "employment_length_years": 3.0,
        "debt": 20000.0,
        "credit_score": 720,
        "loan_amount": 150000.0,
        "loan_purpose": "EDUCATION",
        "home_ownership": "OWN",
        "previous_default": 0
    }, headers=headers)
    assert create_res.status_code == 201
    app_id = create_res.json()["application_id"]

    with patch("backend.routes.fraud.head_office_client.check_fraud", side_effect=HeadOfficeUnavailableException("BLOCKED — Head Office fraud API contract unavailable")):

        res = client.post("/api/fraud/check", json={"application_id": app_id}, headers=headers)
        assert res.status_code == 503
        data = res.json()
        assert data["error"]["code"] == "HEAD_OFFICE_UNAVAILABLE"
        assert "BLOCKED" in data["error"]["message"]


def test_security_verification_no_raw_biometric_data_persisted():
    """Verify raw fingerprint data is never saved to database models."""
    db = SessionLocal()
    try:
        # Inspect columns of FraudFlag and LoanApplication to ensure no fingerprint_bytes column exists
        ff_cols = [c.name for c in FraudFlag.__table__.columns]
        app_cols = [c.name for c in LoanApplication.__table__.columns]

        assert "fingerprint_image" not in ff_cols
        assert "fingerprint_bytes" not in ff_cols
        assert "fingerprint_image" not in app_cols
        assert "fingerprint_bytes" not in app_cols
    finally:
        db.close()
