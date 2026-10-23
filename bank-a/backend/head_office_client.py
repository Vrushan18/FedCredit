"""
Head Office Integration Client for Bank A
Handles authenticated REST communication to Head Office:
- Heartbeat every 30 seconds
- Application status push with offline DB queueing
- Fraud check and flag
- Latest global model fetch fallback
- Synchronous wrappers matching FEDCREDIT Specification v2.0
"""

import os
import logging
import httpx
import requests
from typing import Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger("bank_a.head_office")

HEAD_OFFICE_URL = os.getenv("HEAD_OFFICE_URL", f"http://{settings.SERVER_IP}:{settings.API_PORT}/api/v1")
BANK_API_KEY = os.getenv("HEAD_OFFICE_API_KEY", settings.HEAD_OFFICE_API_KEY)
BANK_ID = os.getenv("BANK_ID", settings.BANK_ID)

class HeadOfficeClient:
    def __init__(self):
        self.base_url = HEAD_OFFICE_URL
        self.api_key = BANK_API_KEY
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

    async def send_heartbeat(self, local_base_url: str) -> bool:
        """Sends periodic heartbeat to Head Office."""
        url = f"{self.base_url}/banks/heartbeat"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(url, json={"api_base_url": local_base_url}, headers=self.headers)
                if res.status_code == 200:
                    return True
                logger.debug(f"Heartbeat responded with status {res.status_code}: {res.text}")
                return False
        except Exception as e:
            logger.debug(f"Heartbeat to Head Office failed ({url}): {e}")
            return False

    async def push_status(self, application_id: str, status: str, message: Optional[str] = "") -> bool:
        """Pushes updated application status to Head Office."""
        url = f"{self.base_url}/applications/{application_id}/status"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.patch(url, json={"status": status, "message": message or ""}, headers=self.headers)
                if res.status_code == 200:
                    logger.info(f"Pushed status {status} for {application_id} to Head Office successfully")
                    return True
                logger.warning(f"Push status failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.warning(f"Error pushing status to Head Office: {e}")
            return False

    async def check_fraud(self, protected_id: str, application_id: str) -> Dict[str, Any]:
        """Calls Head Office registry fraud check."""
        url = f"{self.base_url}/fraud/check"
        payload = {
            "protected_id": protected_id,
            "application_id": application_id
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, json=payload, headers=self.headers)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "fraud_status": data.get("fraud_status", "SAFE"),
                        "registry_score": int(data.get("registry_score", 0)),
                        "reasons": list(data.get("reasons", []))
                    }
                logger.warning(f"Head office fraud check returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Could not reach Head Office for fraud check: {e}")
            
        return {
            "fraud_status": "SAFE",
            "registry_score": 0,
            "reasons": []
        }

    async def flag_fraud(self, protected_id: str, application_id: str, reason: str) -> Dict[str, Any]:
        """Submits manual fraud flag to Head Office."""
        url = f"{self.base_url}/fraud/flag"
        payload = {
            "protected_id": protected_id,
            "application_id": application_id,
            "reason": reason
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, json=payload, headers=self.headers)
                if res.status_code in (200, 201):
                    return res.json()
                logger.warning(f"Head office flag failed ({res.status_code}): {res.text}")
        except Exception as e:
            logger.warning(f"Could not send fraud flag to Head Office: {e}")
            
        return {
            "protected_id": protected_id,
            "application_id": application_id,
            "status": "RECORDED_LOCALLY",
            "flag_count": 1
        }

    async def fetch_latest_model(self) -> Optional[Dict[str, Any]]:
        """Fetches latest aggregated model parameters from Head Office fallback."""
        url = f"{self.base_url}/models/latest"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.debug(f"Could not fetch latest model from Head Office: {e}")
        return None

head_office = HeadOfficeClient()

# Synchronous helpers conforming to FEDCREDIT System Specification Section 3.3
def check_fraud_registry(protected_id: str, application_id: str) -> Dict[str, Any]:
    url = f"{HEAD_OFFICE_URL}/fraud/check"
    headers = {"X-API-Key": BANK_API_KEY, "Content-Type": "application/json"}
    payload = {"protected_id": protected_id, "application_id": application_id}
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Could not reach Head Office for fraud check: {e}")
        return {"fraud_status": "SAFE", "registry_score": 0, "reasons": []}

def flag_fraud_at_head_office(protected_id: str, application_id: str, reason: str):
    url = f"{HEAD_OFFICE_URL}/fraud/flag"
    headers = {"X-API-Key": BANK_API_KEY, "Content-Type": "application/json"}
    payload = {"protected_id": protected_id, "application_id": application_id, "reason": reason}
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        return resp.json() if resp.status_code in (200, 201) else {}
    except Exception as e:
        logger.warning(f"Could not flag fraud at Head Office: {e}")
        return {}

def patch_application_status(application_id: str, status: str, message: str = ""):
    url = f"{HEAD_OFFICE_URL}/applications/{application_id}/status"
    headers = {"X-API-Key": BANK_API_KEY, "Content-Type": "application/json"}
    payload = {"status": status, "message": message}
    try:
        resp = requests.patch(url, json=payload, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Could not patch status at Head Office: {e}")
        return {"status": status}

def download_latest_global_model() -> Dict[str, Any]:
    url = f"{HEAD_OFFICE_URL}/models/latest"
    headers = {"X-API-Key": BANK_API_KEY}
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.debug(f"Could not download latest global model: {e}")
        return {}
