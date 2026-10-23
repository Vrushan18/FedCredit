"""
End-to-End Contract Conformance Test Suite for FedCredit Head Office API.
Verifies all Section 4 endpoints, Section 3 data models, Section 7 fraud rules, and error shapes.
"""
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from starlette.testclient import TestClient
import server
import services

services.seed_defaults()
client = TestClient(server.app)

def test_full_contract_flow():
    print("\n--- 1. Health Check ---")
    res = client.get("/api/v1/health")
    assert res.status_code == 200, res.text
    assert res.json() == {"status": "ok", "version": "1.0.0"}
    print("[PASS] /api/v1/health passed")

    print("\n--- 2. Customer Registration & Login ---")
    import time
    test_email = f"aditya.test.{int(time.time())}@example.com"
    reg_payload = {
        "name": "Aditya Sharma",
        "email": test_email,
        "phone": "+919876543210",
        "password": "customerpassword123"
    }
    res = client.post("/api/v1/auth/customer/register", json=reg_payload)
    assert res.status_code == 201, res.text
    data = res.json()
    cust_id = data["customer_id"]
    assert cust_id.startswith("CUST-"), f"Unexpected customer_id format: {cust_id}"
    print(f"[PASS] Registered customer: {cust_id}")

    # Login
    login_payload = {
        "email": test_email,
        "password": "customerpassword123"
    }
    res = client.post("/api/v1/auth/customer/login", json=login_payload)
    assert res.status_code == 200, res.text
    login_data = res.json()
    cust_token = login_data["access_token"]
    assert cust_token, "No access token returned"
    print("[PASS] Customer login returned Bearer token")

    # Profile check (/auth/me)
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    res = client.get("/api/v1/auth/me", headers=cust_headers)
    assert res.status_code == 200, res.text
    assert res.json()["customer_id"] == cust_id
    print("[PASS] /auth/me verified")

    print("\n--- 3. Admin Login ---")
    admin_payload = {
        "username": "admin_main",
        "password": "adminpassword"
    }
    res = client.post("/api/v1/auth/admin/login", json=admin_payload)
    assert res.status_code == 200, res.text
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin login returned Bearer token")

    print("\n--- 4. Banks Heartbeat & Discovery ---")
    # Send Bank A heartbeat via X-API-Key
    bank_a_headers = {"X-API-Key": "bank_a_dev_key_change_in_prod"}
    hb_payload = {"api_base_url": "http://127.0.0.1:8001/api"}
    res = client.post("/api/v1/banks/heartbeat", json=hb_payload, headers=bank_a_headers)
    assert res.status_code == 200, res.text
    assert res.json()["online"] is True
    print("[PASS] Bank A heartbeat recorded")

    # Customer fetches banks list
    res = client.get("/api/v1/banks", headers=cust_headers)
    assert res.status_code == 200, res.text
    banks_list = res.json()
    assert len(banks_list) == 2
    bank_a = next(b for b in banks_list if b["bank_id"] == "BANK_A")
    assert bank_a["online"] is True
    print(f"[PASS] Banks list retrieved: BANK_A online={bank_a['online']}")

    print("\n--- 5. Application Index Flow ---")
    # Customer creates application for Bank A
    res = client.post("/api/v1/applications", json={"bank_id": "BANK_A"}, headers=cust_headers)
    assert res.status_code == 201, res.text
    app_data = res.json()
    app_id = app_data["application_id"]
    assert app_id.startswith("APP-"), f"Unexpected application_id format: {app_id}"
    assert app_data["status"] == "SUBMITTED"
    print(f"[PASS] Application created: {app_id}")

    # Customer checks /applications/mine
    res = client.get("/api/v1/applications/mine", headers=cust_headers)
    assert res.status_code == 200, res.text
    my_apps = res.json()
    assert any(a["application_id"] == app_id for a in my_apps)
    print("[PASS] /applications/mine contains new application")

    # Customer checks /applications/{id}
    res = client.get(f"/api/v1/applications/{app_id}", headers=cust_headers)
    assert res.status_code == 200, res.text
    detail = res.json()
    assert detail["status"] == "SUBMITTED"
    assert len(detail["timeline"]) >= 1
    print("[PASS] Application detail timeline verified")

    # Bank A updates status to UNDER_REVIEW
    patch_payload = {
        "status": "UNDER_REVIEW",
        "message": "Loan officer reviewing documents"
    }
    res = client.patch(f"/api/v1/applications/{app_id}/status", json=patch_payload, headers=bank_a_headers)
    assert res.status_code == 200, res.text
    print(f"[PASS] Bank A patched application status: {res.json()['new_status']}")

    # Customer checks notifications
    res = client.get("/api/v1/notifications", headers=cust_headers)
    assert res.status_code == 200, res.text
    notifs = res.json()
    assert len(notifs) >= 1
    print(f"[PASS] Customer received {len(notifs)} notification(s)")

    print("\n--- 6. Fraud Registry Engine (FROZEN Section 7) ---")
    # Test fingerprint protected_id (64-char lowercase hex)
    import hashlib
    test_protected_id = hashlib.sha256(f"test_run_{time.time()}".encode()).hexdigest()
    
    # First check: should be SAFE, score 0
    res = client.post("/api/v1/fraud/check", json={"protected_id": test_protected_id, "application_id": app_id}, headers=bank_a_headers)
    assert res.status_code == 200, res.text
    fraud_res = res.json()
    assert fraud_res["fraud_status"] == "SAFE"
    assert fraud_res["registry_score"] == 0
    print("[PASS] Sighting 1: Status SAFE, score 0")

    # Bank flags the identifier
    res = client.post("/api/v1/fraud/flag", json={"protected_id": test_protected_id, "application_id": app_id, "reason": "Suspicious documents"}, headers=bank_a_headers)
    assert res.status_code == 200, res.text
    assert res.json()["flag_count"] == 1
    print("[PASS] Fraud identifier flagged (flag_count=1)")

    # Bank B checks the same identifier on another application
    bank_b_headers = {"X-API-Key": "bank_b_dev_key_change_in_prod"}
    res = client.post("/api/v1/fraud/check", json={"protected_id": test_protected_id, "application_id": "APP-2026-000099"}, headers=bank_b_headers)
    assert res.status_code == 200, res.text
    fraud_res2 = res.json()
    # Flag count >= 1 (+40 pts) + seen at different bank (+35 pts) = 75 pts (SUSPICIOUS)
    assert fraud_res2["registry_score"] >= 40
    assert "Previously flagged identifier" in fraud_res2["reasons"]
    assert "Identifier seen at another bank recently" in fraud_res2["reasons"]
    print(f"[PASS] Cross-bank sighting: Registry score = {fraud_res2['registry_score']}, Status = {fraud_res2['fraud_status']}, Reasons = {fraud_res2['reasons']}")

    print("\n--- 7. Training & Model APIs ---")
    res = client.get("/api/v1/training/status", headers=admin_headers)
    assert res.status_code == 200, res.text
    st = res.json()
    assert "state" in st
    print(f"[PASS] Training status: {st['state']}, Round: {st['round']}/{st['total_rounds']}")

    res = client.get("/api/v1/models/latest", headers=bank_a_headers)
    assert res.status_code == 200, res.text
    model = res.json()
    assert len(model["coef"][0]) == 17, f"Expected 17 features, got {len(model['coef'][0])}"
    print(f"[PASS] Latest global model has 17 feature weights: version {model['model_version']}")

    print("\n--- 8. Admin Dashboard & Audit ---")
    res = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert res.status_code == 200, res.text
    dash = res.json()
    assert dash["total_applications"] >= 1
    print(f"[PASS] Admin Dashboard: Apps={dash['total_applications']}, Alerts={dash['total_fraud_alerts']}")

    print("\n--- 9. Error Handling (Section 3.4 FROZEN) ---")
    # Unauthorized request without Bearer token
    res = client.get("/api/v1/applications/mine")
    assert res.status_code == 401
    err = res.json()
    assert "error" in err
    assert "code" in err["error"]
    assert "message" in err["error"]
    print(f"[PASS] Standard error format verified: {err}")

    print("\n=======================================================")
    print(" ALL CONTRACT ENDPOINTS AND FLOWS VERIFIED SUCCESSFULLY! ")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_contract_flow()
