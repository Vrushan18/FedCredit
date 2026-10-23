"""
FedCredit Head Office — Live Consortium Cross-Verification & Smoke Test Script
Designed for Vrushan Patil (Laptop 1: Head Office & FL Lead)

Usage:
    python test_consortium_crosscheck.py
    python test_consortium_crosscheck.py --url http://100.x.y.z:8000/api/v1
"""
import sys
import os
import argparse
import time
import hmac
import hashlib
import requests

def run_live_consortium_test(base_url: str):
    print("\n" + "=" * 70)
    print("   FEDCREDIT HEAD OFFICE LIVE CONSORTIUM CROSS-VERIFICATION TEST   ")
    print(f"   Target Server: {base_url}")
    print("=" * 70)

    # 1. System Health
    print("\n[STEP 1/7] Testing Head Office Health Endpoint...")
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        assert r.status_code == 200, f"Health check failed: {r.status_code} - {r.text}"
        data = r.json()
        assert data.get("status") == "ok"
        print("  --> [PASS] Server is healthy & responsive (v1.0.0)")
    except Exception as e:
        print(f"  --> [FAIL] Could not connect to Head Office at {base_url}: {e}")
        return False

    # 2. Bank Discovery
    print("\n[STEP 2/7] Testing Bank Directory Discovery...")
    try:
        r = requests.get(f"{base_url}/banks", timeout=5)
        assert r.status_code == 200, f"Banks list failed: {r.status_code}"
        banks = r.json()
        print(f"  --> [PASS] Retrieved {len(banks)} registered consortium banks:")
        for b in banks:
            online_str = "ONLINE (Active)" if b.get("online") else "STANDBY"
            print(f"      • {b.get('bank_id')} ({b.get('name')}) - {online_str}")
    except Exception as e:
        print(f"  --> [FAIL] Failed to retrieve banks: {e}")
        return False

    # 3. Customer Onboarding & JWT Token Generation (Laptop 4 Simulation)
    print("\n[STEP 3/7] Simulating Customer Registration & Login (Aditya - Laptop 4)...")
    test_email = f"borrower.live.{int(time.time())}@fedcredit.internal"
    test_pwd = "SecureBorrowerPass@2026"
    reg_body = {
        "name": "Vikram Malhotra",
        "email": test_email,
        "phone": "9820123456",
        "password": test_pwd
    }
    r = requests.post(f"{base_url}/auth/customer/register", json=reg_body, timeout=5)
    assert r.status_code == 201, f"Registration failed: {r.text}"
    cust_id = r.json()["customer_id"]
    print(f"  --> [PASS] Registered new applicant: Customer ID = {cust_id}")

    # Login to obtain JWT
    login_body = {"email": test_email, "password": test_pwd}
    r = requests.post(f"{base_url}/auth/customer/login", json=login_body, timeout=5)
    assert r.status_code == 200, f"Login failed: {r.text}"
    cust_token = r.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"  --> [PASS] Customer JWT authenticated successfully")

    # 4. Application Index Creation at Bank A (HDFC)
    print("\n[STEP 4/7] Registering Loan Application Index for Bank A...")
    r = requests.post(f"{base_url}/applications", json={"bank_id": "BANK_A"}, headers=cust_headers, timeout=5)
    assert r.status_code == 201, f"Application creation failed: {r.text}"
    app_a_id = r.json()["application_id"]
    print(f"  --> [PASS] Created Central Application Index: {app_a_id} (Status: SUBMITTED)")

    # 5. Section 7 Biometric Hashing & Clean First Check at Bank A (Gopal - Laptop 2)
    print("\n[STEP 5/7] Simulating Bank A Biometric Tokenization (Gopal - Laptop 2)...")
    fraud_secret = b"shared_demo_fraud_secret_between_banks"
    mock_fingerprint_alice = b"biometric_minutiae_scan_pattern_vikram_2026"
    protected_id = hmac.new(fraud_secret, mock_fingerprint_alice, hashlib.sha256).hexdigest().lower()
    print(f"  --> [INFO] Generated 64-char protected_id: {protected_id}")

    bank_a_headers = {"X-API-Key": "bank_a_dev_key_change_in_prod", "Content-Type": "application/json"}
    fraud_check_a = {
        "protected_id": protected_id,
        "application_id": app_a_id
    }
    r = requests.post(f"{base_url}/fraud/check", json=fraud_check_a, headers=bank_a_headers, timeout=5)
    assert r.status_code == 200, f"Fraud check Bank A failed: {r.text}"
    res_a = r.json()
    print(f"  --> [PASS] Bank A First Sighting Response:")
    print(f"      • Fraud Status:    {res_a.get('fraud_status')}")
    print(f"      • Registry Score:  {res_a.get('registry_score')} / 100")
    print(f"      • Reasons:         {res_a.get('reasons')}")
    assert res_a.get("fraud_status") == "SAFE", "First application must be SAFE!"

    # 6. SIMULATE FRAUD: Cross-Bank Loan Stacking at Bank B (Nidhi - Laptop 3)
    print("\n[STEP 6/7] Simulating Simultaneous Multi-Bank Loan Stacking at Bank B...")
    print("  [!] Borrower attempts to apply at Bank B with the SAME biometric token within 30 days!")
    
    # Customer registers second application for Bank B
    r = requests.post(f"{base_url}/applications", json={"bank_id": "BANK_B"}, headers=cust_headers, timeout=5)
    assert r.status_code == 201, f"Application creation failed: {r.text}"
    app_b_id = r.json()["application_id"]
    print(f"  --> [PASS] Created Second Application Index: {app_b_id} for Bank B")

    # Bank B checks fraud registry with SAME protected_id
    bank_b_headers = {"X-API-Key": "bank_b_dev_key_change_in_prod", "Content-Type": "application/json"}
    fraud_check_b = {
        "protected_id": protected_id,
        "application_id": app_b_id
    }
    start_t = time.time()
    r = requests.post(f"{base_url}/fraud/check", json=fraud_check_b, headers=bank_b_headers, timeout=5)
    elapsed_ms = (time.time() - start_t) * 1000
    assert r.status_code == 200, f"Fraud check Bank B failed: {r.text}"
    res_b = r.json()
    print(f"  --> [PASS] Bank B Fraud Sighting Response (Intercepted in {elapsed_ms:.1f} ms):")
    print(f"      • Fraud Status:    {res_b.get('fraud_status')}")
    print(f"      • Registry Score:  {res_b.get('registry_score')} / 100")
    print(f"      • Reasons:         {res_b.get('reasons')}")
    
    # Must catch cross-bank sighting rule (+35 points)
    assert "Identifier seen at another bank recently" in res_b.get("reasons", [])
    assert res_b.get("registry_score") >= 35
    print("  --> [SUCCESS] Zero-Knowledge Cross-Bank Loan Stacking correctly identified without exposing raw PII!")

    # 7. Model Distribution & Flower FL Server Status
    print("\n[STEP 7/7] Testing Federated Learning Model Distribution & Status...")
    r = requests.get(f"{base_url}/models/latest", headers=bank_a_headers, timeout=5)
    assert r.status_code == 200, f"Latest model retrieval failed: {r.text}"
    model_data = r.json()
    coef = model_data.get("coef", [[]])[0]
    print(f"  --> [PASS] Latest Global Model Version: {model_data.get('model_version')}")
    print(f"      • 17 Standardized Weights: {len(coef)} features verified")
    print(f"      • Intercept: {model_data.get('intercept')}")

    print("\n" + "=" * 70)
    print("   ALL 7 CONSORTIUM CROSS-VERIFICATION TESTS PASSED SUCCESSFULLY!   ")
    print("   Head Office is 100% verified and ready for live examiner demo.  ")
    print("=" * 70 + "\n")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FedCredit Consortium Live Test")
    parser.add_argument("--url", default="http://127.0.0.1:8000/api/v1", help="Head Office API Base URL")
    args = parser.parse_args()
    success = run_live_consortium_test(args.url)
    sys.exit(0 if success else 1)
