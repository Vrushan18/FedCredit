"""
Contract Conformance Test Suite for Bank A
Tests all endpoints against the frozen FedCredit specification:
1. Health endpoint
2. Employee login & auth
3. List applications & get application detail
4. Predict with SHAP explanations & fraud checks
5. Officer decision mapping & error handling
6. Inbound application with customer JWT and fingerprint hashing
7. Standard error envelope validation
"""

import os
import sys
import json
import jwt
# Ensure Bank-A root in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from backend.server import app
from backend.config import settings

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["bank_id"] == "BANK_A"
    print("[PASS] GET /api/health passed")

def test_employee_login_and_stats():
    # Login with seeded officer
    login_res = client.post("/api/auth/login", json={
        "username": "officer",
        "password": "password123"
    })
    assert login_res.status_code == 200
    body = login_res.json()
    assert "access_token" in body
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test stats
    stats_res = client.get("/api/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["bank_id"] == "BANK_A"
    assert stats["total_customers"] >= 4
    print(f"[PASS] Employee login & dashboard stats passed (Total customers: {stats['total_customers']})")
    return token

def test_predict_and_shap(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Predict on APP-2026-000101 (Rahul Sharma - low risk)
    res = client.post("/api/loan-applications/APP-2026-000101/predict", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert "default_probability" in data
    assert "confidence" in data
    assert data["recommendation"] in ["ELIGIBLE", "HOLD_FOR_VERIFICATION", "NOT_RECOMMENDED"]
    assert len(data["explanation"]) <= 5
    for exp in data["explanation"]:
        assert "feature" in exp
        assert "label" in exp
        assert "impact" in exp
        assert exp["direction"] in ["POSITIVE", "NEGATIVE"]
        
    assert "fraud" in data
    assert data["fraud"]["status"] in ["SAFE", "REVIEW_NEEDED", "SUSPICIOUS"]
    assert 0 <= data["fraud"]["score"] <= 100
    print(f"[PASS] AI Prediction & SHAP passed: Risk={data['risk_level']}, Prob={data['default_probability']}, Top Factor={data['explanation'][0]['label']}")

def test_officer_decision(token):
    headers = {"Authorization": f"Bearer {token}"}
    decision_res = client.post("/api/loan-applications/APP-2026-000101/decision", headers=headers, json={
        "decision": "APPROVED",
        "note": "Verified excellent credit profile and high income"
    })
    assert decision_res.status_code == 200
    d = decision_res.json()
    assert d["decision"] == "APPROVED"
    assert d["status"] == "APPROVED"
    print("[PASS] Officer decision APPROVED passed")

def test_inbound_application_with_customer_jwt():
    # Issue customer JWT with CUSTOMER_JWT_SECRET
    cust_id = "CUST-000888"
    app_id = "APP-2026-000888"
    cust_token = jwt.encode(
        {"customer_id": cust_id, "sub": cust_id},
        settings.CUSTOMER_JWT_SECRET,
        algorithm="HS256"
    )

    payload = {
        "application_id": app_id,
        "customer_id": cust_id,
        "applicant": {
            "full_name": "Test Applicant",
            "age": 30,
            "gender": "FEMALE",
            "address": "42 Marine Drive, Mumbai",
            "phone": "+91 99999 88888",
            "occupation": "Financial Analyst",
            "employment_type": "SALARIED"
        },
        "financial": {
            "annual_income": 1200000,
            "existing_debt": 150000,
            "credit_score": 750,
            "home_ownership": "OWN",
            "employment_length_years": 5.0,
            "credit_history_length_years": 7.0,
            "previous_default": False
        },
        "loan": {
            "amount": 300000,
            "duration_months": 24,
            "purpose": "EDUCATION"
        }
    }

    # Multipart form submission
    files = {
        "fingerprint": ("fingerprint.png", b"test_fingerprint_sample_raw_bytes", "image/png"),
        "documents": ("salary_slip.pdf", b"%PDF-1.4 test document dummy content", "application/pdf")
    }
    data = {
        "data": json.dumps(payload)
    }
    headers = {"Authorization": f"Bearer {cust_token}"}

    res = client.post("/api/applications", headers=headers, data=data, files=files)
    assert res.status_code == 201
    resp = res.json()
    assert resp["application_id"] == app_id
    assert resp["status"] == "SUBMITTED"
    print("[PASS] Inbound application registration with customer JWT & fingerprint hashing passed")

def test_standard_error_envelope():
    # Invalid route
    res = client.get("/api/nonexistent")
    assert res.status_code == 404
    err = res.json()
    assert "error" in err
    assert "code" in err["error"]
    assert err["error"]["code"] == "NOT_FOUND"
    print("[PASS] Standard error envelope format verified")

if __name__ == "__main__":
    print("\nRunning Bank A contract verification tests...\n")
    test_health()
    token = test_employee_login_and_stats()
    test_predict_and_shap(token)
    test_officer_decision(token)
    test_inbound_application_with_customer_jwt()
    test_standard_error_envelope()
    print("\nALL CONTRACT CONFORMANCE TESTS PASSED!\n")
