# bank-a/head_office_client.py (identical for bank-b)
# Head Office REST Communicator

import os
import requests
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("bank_a.head_office")

HEAD_OFFICE_URL = os.getenv("HEAD_OFFICE_URL", "http://100.127.141.31:8000/api/v1")
BANK_API_KEY = os.getenv("HEAD_OFFICE_API_KEY", "bank_a_dev_key_change_in_prod")
BANK_ID = os.getenv("BANK_ID", "BANK_A")

def check_fraud_registry(protected_id: str, application_id: str) -> Dict[str, Any]:
    """
    Queries Head Office Section 7 Fraud Registry.
    Transmits ONLY the 64-char protected_id. Returns status, score, reasons.
    """
    url = f"{HEAD_OFFICE_URL}/fraud/check"
    headers = {
        "X-API-Key": BANK_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "protected_id": protected_id,
        "application_id": application_id
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()  # {"fraud_status": "SAFE"|"REVIEW_NEEDED"|"SUSPICIOUS", "registry_score": int, "reasons": []}
    except Exception as e:
        logger.warning(f"Could not reach Head Office for fraud check ({url}): {e}")
        return {"fraud_status": "SAFE", "registry_score": 0, "reasons": []}

def flag_fraud_at_head_office(protected_id: str, application_id: str, reason: str):
    """Alerts the entire consortium to flag this identifier."""
    url = f"{HEAD_OFFICE_URL}/fraud/flag"
    headers = {"X-API-Key": BANK_API_KEY, "Content-Type": "application/json"}
    payload = {
        "protected_id": protected_id,
        "application_id": application_id,
        "reason": reason
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        return resp.json() if resp.status_code in (200, 201) else {}
    except Exception as e:
        logger.warning(f"Could not flag fraud at Head Office ({url}): {e}")
        return {}

def patch_application_status(application_id: str, status: str, message: str = ""):
    """Notifies Head Office of decision, which auto-pushes update to borrower."""
    url = f"{HEAD_OFFICE_URL}/applications/{application_id}/status"
    headers = {"X-API-Key": BANK_API_KEY, "Content-Type": "application/json"}
    payload = {"status": status, "message": message}
    try:
        resp = requests.patch(url, json=payload, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Could not patch application status at Head Office ({url}): {e}")
        return {"status": status}

def download_latest_global_model() -> Dict[str, Any]:
    """Downloads latest FL aggregated weights from Head Office."""
    url = f"{HEAD_OFFICE_URL}/models/latest"
    headers = {"X-API-Key": BANK_API_KEY}
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.debug(f"Could not download latest global model from Head Office ({url}): {e}")
        return {}
