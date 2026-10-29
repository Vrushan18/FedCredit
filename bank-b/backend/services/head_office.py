"""
Head Office Fraud API Client for Bank B.
Communicates with Head Office server via X-API-Key authenticated endpoints.
"""
from typing import Dict, Any, Optional
import requests
from backend.config import settings, logger


class HeadOfficeUnavailableException(Exception):
    """Raised when Head Office fraud registry API server is unreachable or offline."""
    pass


class HeadOfficeFraudClient:
    """
    Client for Head Office Fraud Registry API endpoints.
    Base URL derived from SERVER_IP and API_PORT configuration.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, timeout_seconds: int = 3):
        raw_url = base_url or f"http://{settings.SERVER_IP}:{settings.API_PORT}"
        self.base_url = raw_url.rstrip("/") if raw_url.endswith("/api/v1") else f"{raw_url.rstrip('/')}/api/v1"
        self.api_key = api_key or settings.HEAD_OFFICE_API_KEY
        self.timeout = timeout_seconds

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

    def check_fraud(self, protected_id: str, application_id: str) -> Dict[str, Any]:
        """
        Calls Head Office endpoint: POST /fraud/check
        Request Payload: {"protected_id": protected_id, "application_id": application_id}
        Expected Response: {"fraud_status": "SAFE"|"REVIEW_NEEDED"|"SUSPICIOUS", "registry_score": float, "reasons": [...]}
        Raises:
            HeadOfficeUnavailableException: If Head Office connection fails or times out.
        """
        url = f"{self.base_url}/fraud/check"
        payload = {
            "protected_id": protected_id,
            "application_id": application_id
        }

        try:
            logger.info("Connecting to Head Office fraud check endpoint at %s", url)
            res = requests.post(url, json=payload, headers=self._get_headers(), timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
            else:
                logger.warning("Head Office fraud check returned status %d: %s", res.status_code, res.text)
                raise HeadOfficeUnavailableException(f"Head Office fraud API error: status {res.status_code}")
        except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
            logger.warning("Head Office fraud API server is unreachable: %s", str(e))
            raise HeadOfficeUnavailableException("BLOCKED — Head Office fraud API contract unavailable / server unreachable.")

    def flag_fraud(self, protected_id: str, application_id: str, reason: str) -> Dict[str, Any]:
        """
        Calls Head Office endpoint: POST /fraud/flag
        Request Payload: {"protected_id": protected_id, "application_id": application_id, "reason": reason}
        Expected Response: {"protected_id": protected_id, "flag_count": int, "status": str}
        Raises:
            HeadOfficeUnavailableException: If Head Office connection fails or times out.
        """
        url = f"{self.base_url}/fraud/flag"
        payload = {
            "protected_id": protected_id,
            "application_id": application_id,
            "reason": reason
        }

        try:
            logger.info("Reporting manual fraud flag to Head Office endpoint at %s", url)
            res = requests.post(url, json=payload, headers=self._get_headers(), timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
            else:
                logger.warning("Head Office fraud flag returned status %d: %s", res.status_code, res.text)
                raise HeadOfficeUnavailableException(f"Head Office fraud flag API error: status {res.status_code}")
        except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
            logger.warning("Head Office fraud flag API server is unreachable: %s", str(e))
            raise HeadOfficeUnavailableException("BLOCKED — Head Office fraud API contract unavailable / server unreachable.")

    def patch_application_status(self, application_id: str, status: str, message: str = "") -> Dict[str, Any]:
        """
        Calls Head Office endpoint: PATCH /applications/{application_id}/status
        Request Payload: {"status": status, "message": message}
        """
        url = f"{self.base_url}/applications/{application_id}/status"
        payload = {"status": status, "message": message}
        try:
            logger.info("Syncing application status to Head Office at %s: status=%s", url, status)
            res = requests.patch(url, json=payload, headers=self._get_headers(), timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
            logger.warning("Head Office patch application status returned %d: %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("Head Office unreachable when patching status for %s: %s", application_id, str(e))
        return {}

    def download_latest_global_model(self) -> Dict[str, Any]:
        """
        Calls Head Office endpoint: GET /models/latest
        Retrieves global model weights and intercept.
        """
        url = f"{self.base_url}/models/latest"
        try:
            logger.info("Fetching latest global model from Head Office at %s", url)
            res = requests.get(url, headers=self._get_headers(), timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
            logger.warning("Head Office models/latest returned %d: %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("Head Office unreachable when downloading latest global model: %s", str(e))
        return {"coef": [[0.0] * 17], "intercept": [0.0]}
