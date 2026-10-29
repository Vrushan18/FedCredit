import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.database import engine, Base
from database.seed import seed_database

client = TestClient(app)

def get_auth_header():
    login_resp = client.post(
        "/api/auth/employee/login",
        json={"username": "admin_b", "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def setup_module(module):
    Base.metadata.create_all(bind=engine)
    seed_database()

def test_create_application_success():
    headers = get_auth_header()
    payload = {
        "customer_id": "CUST-000001",
        "income": 850000.0,
        "employment_length_years": 5.0,
        "debt": 120000.0,
        "credit_score": 750,
        "loan_amount": 300000.0,
        "loan_purpose": "PERSONAL",
        "home_ownership": "OWN",
        "previous_default": 0
    }
    response = client.post("/api/applications", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["application_id"].startswith("APP-2026-")
    assert data["status"] == "SUBMITTED"

def test_create_application_invalid_customer():
    headers = get_auth_header()
    payload = {
        "customer_id": "CUST-AUTO-001",
        "income": 500000.0,
        "employment_length_years": 2.0,
        "debt": 50000.0,
        "credit_score": 700,
        "loan_amount": 100000.0,
        "loan_purpose": "EDUCATION",
        "home_ownership": "RENT",
        "previous_default": 0
    }
    response = client.post("/api/applications", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["customer_id"] == "CUST-AUTO-001"

def test_create_application_invalid_enum():
    headers = get_auth_header()
    payload = {
        "customer_id": "CUST-000001",
        "income": 500000.0,
        "employment_length_years": 2.0,
        "debt": 50000.0,
        "credit_score": 700,
        "loan_amount": 100000.0,
        "loan_purpose": "INVALID_PURPOSE",
        "home_ownership": "RENT",
        "previous_default": 0
    }
    response = client.post("/api/applications", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

def test_list_and_filter_applications():
    headers = get_auth_header()
    res = client.get("/api/applications?status=SUBMITTED", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_application_valid_status_transition():
    headers = get_auth_header()
    # Create a fresh application
    create_payload = {
        "customer_id": "CUST-000001",
        "income": 600000.0,
        "employment_length_years": 4.0,
        "debt": 40000.0,
        "credit_score": 720,
        "loan_amount": 150000.0,
        "loan_purpose": "MEDICAL",
        "home_ownership": "RENT",
        "previous_default": 0
    }
    create_res = client.post("/api/applications", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    app_id = create_res.json()["application_id"]

    # Transition SUBMITTED -> UNDER_REVIEW
    res1 = client.patch(
        f"/api/applications/{app_id}/status",
        json={"status": "UNDER_REVIEW"},
        headers=headers
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "UNDER_REVIEW"

    # Transition UNDER_REVIEW -> APPROVED
    res2 = client.patch(
        f"/api/applications/{app_id}/status",
        json={"status": "APPROVED"},
        headers=headers
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "APPROVED"

def test_application_invalid_status_transition():
    headers = get_auth_header()
    # Create a fresh application and transition to APPROVED (terminal)
    create_payload = {
        "customer_id": "CUST-000001",
        "income": 600000.0,
        "employment_length_years": 4.0,
        "debt": 40000.0,
        "credit_score": 720,
        "loan_amount": 150000.0,
        "loan_purpose": "MEDICAL",
        "home_ownership": "RENT",
        "previous_default": 0
    }
    create_res = client.post("/api/applications", json=create_payload, headers=headers)
    app_id = create_res.json()["application_id"]

    client.patch(f"/api/applications/{app_id}/status", json={"status": "APPROVED"}, headers=headers)

    # Attempt invalid transition APPROVED -> SUBMITTED
    res = client.patch(
        f"/api/applications/{app_id}/status",
        json={"status": "SUBMITTED"},
        headers=headers
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "Invalid application status transition" in data["error"]["message"]

def test_predictions_endpoint():
    headers = get_auth_header()
    res = client.get("/api/applications/APP-2026-000001/predictions", headers=headers)
    assert res.status_code == 200
    assert "predictions" in res.json()

