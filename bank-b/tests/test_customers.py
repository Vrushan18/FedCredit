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

def test_create_customer_success():
    headers = get_auth_header()
    payload = {
        "name": "Ramesh Kumar",
        "age": 42,
        "gender": "Male",
        "address": "45 MG Road, Pune, Maharashtra",
        "phone": "+919876543210",
        "occupation": "Software Engineer",
        "employment_type": "Salaried"
    }
    response = client.post("/api/customers", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["customer_id"].startswith("CUST-")
    assert data["name"] == "Ramesh Kumar"

def test_list_and_search_customers():
    headers = get_auth_header()
    # List all
    res = client.get("/api/customers", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Search existing customer
    res_search = client.get("/api/customers?search=Ramesh", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1
    assert res_search.json()[0]["name"] == "Ramesh Kumar"

def test_get_customer_details_and_not_found():
    headers = get_auth_header()
    # Get seeded customer CUST-000001
    res = client.get("/api/customers/CUST-000001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "customer" in data
    assert data["customer"]["customer_id"] == "CUST-000001"
    assert "applications" in data

    # 404 test
    res_404 = client.get("/api/customers/CUST-999999", headers=headers)
    assert res_404.status_code == 404
    assert res_404.json()["error"]["code"] == "NOT_FOUND"

def test_customer_unauthorized():
    res = client.get("/api/customers")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"
