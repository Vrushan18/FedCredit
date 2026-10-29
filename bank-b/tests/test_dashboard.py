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

def test_dashboard_stats():
    headers = get_auth_header()
    response = client.get("/api/dashboard/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_customers" in data
    assert "pending_applications" in data
    assert "approved_loans" in data
    assert "rejected_loans" in data
    assert "todays_applications" in data
    assert data["total_customers"] >= 1

def test_dashboard_stats_unauthorized():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
