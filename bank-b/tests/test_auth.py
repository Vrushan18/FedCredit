import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app

client = TestClient(app)

def test_employee_login_success():
    response = client.post(
        "/api/auth/employee/login",
        json={"username": "admin_b", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["employee"]["username"] == "admin_b"
    assert data["employee"]["role"] == "OFFICER"

def test_employee_login_failure():
    response = client.post(
        "/api/auth/employee/login",
        json={"username": "admin_b", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHENTICATED"
    assert "Invalid employee username or password" in data["error"]["message"]

def test_get_current_employee_me():
    # Login first
    login_resp = client.post(
        "/api/auth/employee/login",
        json={"username": "admin_b", "password": "password123"}
    )
    token = login_resp.json()["access_token"]

    # Request /me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_b"
    assert data["role"] == "OFFICER"

def test_get_current_employee_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHENTICATED"
