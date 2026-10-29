"""
Privacy-Preserving Protected ID Generator and Identity Cross-Binding for Bank B.
Generates deterministic 64-character lowercase hexadecimal protected identifiers
from raw fingerprint image bytes using HMAC-SHA256 and FRAUD_SECRET.
Binds salted Aadhaar hashes to protected_ids to intercept synthetic identity spoofing.
"""
import os
import hmac
import hashlib
from typing import Optional
from backend.config import settings, logger

# Shared consortium secrets for zero-knowledge fraud queries and KYC binding
FRAUD_SECRET = os.getenv("FRAUD_SECRET", settings.FRAUD_SECRET).encode("utf-8")
KYC_SALT = os.getenv("KYC_SALT", "consortium_kyc_salt_2026").encode("utf-8")


def generate_protected_id(fingerprint_bytes: bytes, secret: Optional[str] = None) -> str:
    """
    Computes protected_id = HMAC-SHA256(FRAUD_SECRET, fingerprint_image_bytes).
    Returns:
        64-character lowercase hexadecimal string.
    Raises:
        ValueError: If fingerprint_bytes is empty or invalid.
    """
    if not fingerprint_bytes or len(fingerprint_bytes) == 0:
        raise ValueError("Fingerprint image bytes cannot be empty.")

    key = (secret or settings.FRAUD_SECRET).encode("utf-8") if isinstance(secret, str) or (secret is None) else secret
    protected_id = hmac.new(key, fingerprint_bytes, hashlib.sha256).hexdigest().lower()

    assert len(protected_id) == 64, f"Protected ID length must be 64, got {len(protected_id)}"
    logger.info("Generated 64-char protected ID (HMAC-SHA256) for fingerprint data.")
    return protected_id


def compute_aadhaar_hash(aadhaar_number: str) -> str:
    """Computes salted SHA-256 hash of Aadhaar to check local identity-biometric binding."""
    if not aadhaar_number:
        raise ValueError("Aadhaar number cannot be empty.")
    clean_aadhaar = str(aadhaar_number).strip().replace(" ", "").replace("-", "")
    return hashlib.sha256(clean_aadhaar.encode("utf-8") + KYC_SALT).hexdigest()


def verify_identity_biometric_binding(db_conn, aadhaar_number: str, protected_id: str) -> bool:
    """
    Checks if this Aadhaar was previously linked to a DIFFERENT biometric.
    Prevents synthetic fraud (e.g. Alice's Aadhaar used with Bob's fingerprint).
    Supports both SQLAlchemy Session and raw sqlite3/psycopg DB connections.
    """
    aadhaar_hash = compute_aadhaar_hash(aadhaar_number)
    
    # SQLAlchemy Session support
    if hasattr(db_conn, "query"):
        from backend.models import CustomerKycBinding
        existing = db_conn.query(CustomerKycBinding).filter(CustomerKycBinding.aadhaar_hash == aadhaar_hash).first()
        if existing:
            if existing.protected_id != protected_id:
                logger.warning(
                    "Identity mismatch detected! Aadhaar hash %s linked to %s, received %s",
                    aadhaar_hash[:12], existing.protected_id[:12], protected_id[:12]
                )
                return False
            return True
        else:
            new_binding = CustomerKycBinding(aadhaar_hash=aadhaar_hash, protected_id=protected_id)
            db_conn.add(new_binding)
            db_conn.commit()
            logger.info("Recorded new Aadhaar-biometric binding for hash %s", aadhaar_hash[:12])
            return True

    # Raw database connection support (db_conn.cursor())
    cursor = db_conn.cursor()
    cursor.execute(
        "SELECT protected_id FROM customer_kyc_bindings WHERE aadhaar_hash = ?",
        (aadhaar_hash,)
    )
    row = cursor.fetchone()
    if row:
        existing_bio = row[0]
        if existing_bio != protected_id:
            logger.warning("Identity mismatch detected via raw DB connection!")
            return False
        return True
    else:
        cursor.execute(
            "INSERT INTO customer_kyc_bindings (aadhaar_hash, protected_id) VALUES (?, ?)",
            (aadhaar_hash, protected_id)
        )
        db_conn.commit()
        logger.info("Recorded new Aadhaar-biometric binding in local DB.")
        return True

