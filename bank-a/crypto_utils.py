# bank-a/crypto_utils.py (identical for bank-b)
# Cryptographic Tokenization & Identity Cross-Binding

import hmac
import hashlib
import os

# FRAUD_SECRET shared across banking consortium for zero-knowledge fraud queries
FRAUD_SECRET = os.getenv("FRAUD_SECRET", "shared_demo_fraud_secret_between_banks").encode("utf-8")
KYC_SALT = os.getenv("KYC_SALT", "consortium_kyc_salt_2026").encode("utf-8")

def generate_protected_id(biometric_bytes: bytes) -> str:
    """
    Computes 64-char lowercase HMAC-SHA256 token of biometric image bytes.
    This protected_id is the ONLY value sent to Head Office Fraud Registry.
    """
    return hmac.new(FRAUD_SECRET, biometric_bytes, hashlib.sha256).hexdigest().lower()

def compute_aadhaar_hash(aadhaar_number: str) -> str:
    """Computes salted hash of Aadhaar to check local identity-biometric binding."""
    clean_aadhaar = str(aadhaar_number).strip().replace(" ", "")
    return hashlib.sha256(clean_aadhaar.encode("utf-8") + KYC_SALT).hexdigest()

def verify_identity_biometric_binding(db_conn, aadhaar_number: str, protected_id: str) -> bool:
    """
    Checks if this Aadhaar was previously linked to a DIFFERENT biometric.
    Prevents synthetic fraud (e.g. Alice's Aadhaar used with Bob's fingerprint).
    """
    aadhaar_hash = compute_aadhaar_hash(aadhaar_number)
    cursor = db_conn.cursor()
    cursor.execute(
        "SELECT protected_id FROM customer_kyc_bindings WHERE aadhaar_hash = ?", 
        (aadhaar_hash,)
    )
    row = cursor.fetchone()
    if row:
        existing_bio = row[0]
        if existing_bio != protected_id:
            # Identity mismatch: Same Aadhaar has arrived with a different fingerprint!
            return False
    else:
        # First time seen: record the binding
        cursor.execute(
            "INSERT INTO customer_kyc_bindings (aadhaar_hash, protected_id) VALUES (?, ?)",
            (aadhaar_hash, protected_id)
        )
        db_conn.commit()
    return True
