"""
Test suite for Bank A:
1. Synthetic Identity Impersonation Check (Alice's Aadhaar with Bob's Fingerprint)
2. Cryptographic tokenization & Aadhaar-biometric binding verification
3. Model Scorer 17-feature vector & decision logic
"""

import os
import sys
import sqlite3
import hmac
import hashlib

# Ensure Bank-A root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from crypto_utils import generate_protected_id, compute_aadhaar_hash, verify_identity_biometric_binding
from model_scorer import assemble_17_feature_vector, score_credit_risk

def test_crypto_tokenization():
    print("Testing crypto_utils tokenization...")
    alice_bio = b"sample_fingerprint_minutiae_data_alice_2026_padding_for_1000_bytes_" + b"0" * 1000
    bob_bio = b"sample_fingerprint_minutiae_data_bob_2026_padding_for_1000_bytes_" + b"1" * 1000

    alice_protected_id = generate_protected_id(alice_bio)
    bob_protected_id = generate_protected_id(bob_bio)

    assert len(alice_protected_id) == 64, f"Expected 64 chars, got {len(alice_protected_id)}"
    assert len(bob_protected_id) == 64, f"Expected 64 chars, got {len(bob_protected_id)}"
    assert alice_protected_id != bob_protected_id, "Alice and Bob hashes should differ"
    assert alice_protected_id == alice_protected_id.lower()
    print(f"  [PASS] Alice protected_id: {alice_protected_id[:16]}...")
    print(f"  [PASS] Bob protected_id:   {bob_protected_id[:16]}...")

def test_aadhaar_binding_mismatch():
    print("Testing Synthetic Identity Impersonation (Alice's Aadhaar with Bob's Fingerprint)...")
    # In-memory test SQLite DB
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE customer_kyc_bindings (
            aadhaar_hash TEXT PRIMARY KEY,
            protected_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    alice_aadhaar = "9999 8888 7777"
    alice_bio = b"alice_biometric_data_real" * 50
    bob_bio = b"bob_biometric_data_fake" * 50

    alice_prot_id = generate_protected_id(alice_bio)
    bob_prot_id = generate_protected_id(bob_bio)

    # 1. Alice applies first time
    res1 = verify_identity_biometric_binding(conn, alice_aadhaar, alice_prot_id)
    assert res1 is True, "First time application for Alice should succeed"
    print("  [PASS] Alice first registration: Aadhaar bound to Alice's protected_id successfully.")

    # 2. Alice applies again later with her own biometric
    res2 = verify_identity_biometric_binding(conn, alice_aadhaar, alice_prot_id)
    assert res2 is True, "Alice applying again with same biometric must be accepted"
    print("  [PASS] Alice subsequent registration with matching biometric accepted.")

    # 3. Fraudster Bob submits Alice's Aadhaar with Bob's fingerprint
    res3 = verify_identity_biometric_binding(conn, alice_aadhaar, bob_prot_id)
    assert res3 is False, "Bob using Alice's Aadhaar must be REJECTED as synthetic fraud!"
    print("  [PASS] Synthetic fraud successfully intercepted: Bob's fingerprint does NOT match Alice's Aadhaar binding!")

    conn.close()

def test_model_scorer():
    print("Testing Model Scorer 17-feature vector assembly & decision...")
    vec = assemble_17_feature_vector(
        age=35,
        annual_income=1500000,
        employment_length_years=7,
        loan_amount=300000,
        credit_history_length_years=10,
        previous_default=0,
        home_ownership="OWN",
        loan_purpose="EDUCATION"
    )
    assert len(vec) == 17, f"Expected 17 features, got {len(vec)}"
    assert vec[7 + 1] == 1.0, "OWN should be one-hot index 8"
    assert vec[11 + 0] == 1.0, "EDUCATION should be one-hot index 11"
    print("  [PASS] 17-feature vector assembled correctly.")

    score = score_credit_risk(
        age=35,
        annual_income=1500000,
        employment_length_years=7,
        loan_amount=300000,
        credit_history_length_years=10,
        previous_default=0,
        home_ownership="OWN",
        loan_purpose="EDUCATION"
    )
    assert "decision" in score
    assert "prob_default" in score
    print(f"  [PASS] Credit risk scored successfully: Decision={score['decision']}, Prob={score['prob_default']}")

if __name__ == "__main__":
    print("\n=== RUNNING BANK A SPECIFICATION VERIFICATION SUITE ===\n")
    test_crypto_tokenization()
    test_aadhaar_binding_mismatch()
    test_model_scorer()
    print("\n=== ALL SPECIFICATION TESTS PASSED SUCCESSFULLY! ===\n")
