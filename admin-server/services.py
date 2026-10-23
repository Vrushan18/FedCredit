"""
Business logic and service layer implementing the FedCredit Team Contract.
"""
import hashlib
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List, Dict, Any

from config import get_settings
from auth import hash_password, verify_password, create_customer_token, create_admin_token
from database import (
    admins, customers_auth, customers_by_email, banks,
    applications_index, notifications, fraud_registry, fraud_sightings,
    fl_state, global_model, training_logs, audit_logs, audit, add_notification,
    persist_admin, persist_customer, persist_application, persist_fraud_registry,
    persist_fraud_sighting, persist_training_log, persist_global_model,
    persist_bank_heartbeat, mark_notification_as_read as db_mark_notification_as_read
)
from schemas import (
    ApplicationStatus, OfficerDecision, FraudStatus, NotificationType,
    TrainingState, BankItem, TimelineEvent
)

_settings = get_settings()
_lock = threading.RLock()

_cust_counter = 0
_app_counter = 0

def _now_dt() -> datetime:
    return datetime.now(timezone.utc)

def _now() -> str:
    return _now_dt().isoformat()

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

# ── ID Generators (Section 3.1) ────────────────────────────────────────────────

def generate_customer_id() -> str:
    global _cust_counter
    with _lock:
        _cust_counter += 1
        return f"CUST-{_cust_counter:06d}"

def generate_application_id() -> str:
    global _app_counter
    with _lock:
        _app_counter += 1
        year = _now_dt().year
        return f"APP-{year}-{_app_counter:06d}"

# ── Seed Default Records ───────────────────────────────────────────────────────

def seed_defaults():
    with _lock:
        if "admin_main" not in admins:
            pwd_hash = hash_password("adminpassword")
            admins["admin_main"] = {
                "username": "admin_main",
                "hashed_password": pwd_hash,
                "role": "admin",
                "name": "Central Admin Server",
                "created_at": _now()
            }
            try:
                persist_admin("admin_main", pwd_hash, "admin")
            except Exception:
                pass
        
        # Ensure Bank keys are hashed per .env
        banks["BANK_A"]["api_key_hash"] = hash_api_key(_settings.bank_a_api_key)
        banks["BANK_B"]["api_key_hash"] = hash_api_key(_settings.bank_b_api_key)
        
        # Synchronize counters from persisted database state
        global _cust_counter, _app_counter
        for cid in customers_auth.keys():
            if cid.startswith("CUST-"):
                try:
                    num = int(cid.split("-")[1])
                    _cust_counter = max(_cust_counter, num)
                except Exception:
                    pass
        for aid in applications_index.keys():
            parts = aid.split("-")
            if len(parts) == 3:
                try:
                    num = int(parts[2])
                    _app_counter = max(_app_counter, num)
                except Exception:
                    pass

# ── Auth Services ──────────────────────────────────────────────────────────────

def register_customer(name: str, email: str, phone: str, password: str) -> str:
    email_clean = email.strip().lower()
    with _lock:
        if email_clean in customers_by_email:
            raise ValueError("An account with this email already exists.")
        
        cust_id = generate_customer_id()
        pwd_hash = hash_password(password)
        customers_auth[cust_id] = {
            "customer_id": cust_id,
            "name": name.strip(),
            "email": email_clean,
            "phone": phone.strip(),
            "hashed_password": pwd_hash,
            "created_at": _now()
        }
        customers_by_email[email_clean] = cust_id
        try:
            persist_customer(cust_id, name.strip(), email_clean, phone.strip(), pwd_hash)
        except Exception:
            pass
        audit(actor=cust_id, action="CUSTOMER_REGISTERED", detail=f"Email: {email_clean}")
        return cust_id

def authenticate_customer(email: str, password: str) -> Tuple[str, Dict[str, Any]]:
    email_clean = email.strip().lower()
    with _lock:
        cust_id = customers_by_email.get(email_clean)
        if not cust_id:
            raise ValueError("Invalid email or password.")
        cust = customers_auth[cust_id]
        if not verify_password(password, cust["hashed_password"]):
            raise ValueError("Invalid email or password.")
        
        token = create_customer_token(cust_id)
        audit(actor=cust_id, action="CUSTOMER_LOGIN", detail="Successful login")
        return token, {
            "customer_id": cust["customer_id"],
            "name": cust["name"],
            "email": cust["email"],
            "phone": cust["phone"]
        }

def authenticate_admin(username: str, password: str) -> Tuple[str, Dict[str, Any]]:
    with _lock:
        admin = admins.get(username)
        if not admin or not verify_password(password, admin["hashed_password"]):
            raise ValueError("Invalid admin credentials.")
        
        token = create_admin_token(username)
        audit(actor=username, action="ADMIN_LOGIN", detail="Admin console accessed")
        return token, {
            "username": admin["username"],
            "role": admin["role"]
        }

# ── Bank Key Verification ──────────────────────────────────────────────────────

def verify_bank_api_key(api_key: Optional[str]) -> str:
    """Verifies X-API-Key against stored SHA-256 hashes. Returns bank_id."""
    if not api_key:
        raise PermissionError("Missing X-API-Key header.")
    hashed = hash_api_key(api_key)
    with _lock:
        for b_id, b_data in banks.items():
            if b_data.get("api_key_hash") == hashed:
                return b_id
    raise PermissionError("Invalid X-API-Key.")

def record_bank_heartbeat(bank_id: str, api_base_url: str):
    with _lock:
        if bank_id in banks:
            now_str = _now()
            banks[bank_id]["api_base_url"] = api_base_url
            banks[bank_id]["last_heartbeat"] = now_str
            banks[bank_id]["online"] = True
            try:
                persist_bank_heartbeat(bank_id, api_base_url, now_str)
            except Exception:
                pass

def get_banks_list() -> List[BankItem]:
    """Returns bank list with dynamic online calculation (<60s heartbeat)."""
    result = []
    threshold = _now_dt() - timedelta(seconds=60)
    with _lock:
        for b_id, b_data in banks.items():
            last_hb = b_data.get("last_heartbeat")
            online = False
            if last_hb:
                try:
                    hb_time = datetime.fromisoformat(last_hb)
                    online = hb_time >= threshold
                except Exception:
                    online = False
            result.append(BankItem(
                bank_id=b_id,
                name=b_data["name"],
                api_base_url=b_data["api_base_url"],
                online=online
            ))
    return result

# ── Application Index Services ─────────────────────────────────────────────────

def create_application_index(customer_id: str, bank_id: str) -> str:
    with _lock:
        if bank_id not in banks:
            raise ValueError(f"Unknown bank_id '{bank_id}'. Must be BANK_A or BANK_B.")
        app_id = generate_application_id()
        now_str = _now()
        applications_index[app_id] = {
            "application_id": app_id,
            "customer_id": customer_id,
            "bank_id": bank_id,
            "status": ApplicationStatus.SUBMITTED.value,
            "created_at": now_str,
            "updated_at": now_str,
            "timeline": [
                {
                    "status": ApplicationStatus.SUBMITTED.value,
                    "at": now_str,
                    "message": "Application submitted to bank"
                }
            ]
        }
        try:
            persist_application(applications_index[app_id])
        except Exception:
            pass
        add_notification(
            application_id=app_id,
            customer_id=customer_id,
            type_=NotificationType.STATUS_CHANGED.value,
            message=f"Your loan application {app_id} was submitted successfully."
        )
        audit(actor=customer_id, action="APPLICATION_CREATED", detail=f"App: {app_id} for {bank_id}")
        return app_id

def get_customer_applications(customer_id: str) -> List[Dict[str, Any]]:
    with _lock:
        apps = []
        for app in applications_index.values():
            if app["customer_id"] == customer_id:
                b_name = banks.get(app["bank_id"], {}).get("name", app["bank_id"])
                apps.append({
                    "application_id": app["application_id"],
                    "bank_id": app["bank_id"],
                    "bank_name": b_name,
                    "status": app["status"],
                    "created_at": app["created_at"],
                    "updated_at": app["updated_at"]
                })
        apps.sort(key=lambda x: x["created_at"], reverse=True)
        return apps

def get_application_detail(application_id: str, customer_id: str) -> Dict[str, Any]:
    with _lock:
        app = applications_index.get(application_id)
        if not app:
            raise KeyError(f"Application '{application_id}' not found.")
        if app["customer_id"] != customer_id:
            raise PermissionError("Access denied: You do not own this application.")
        
        b_name = banks.get(app["bank_id"], {}).get("name", app["bank_id"])
        return {
            "application_id": app["application_id"],
            "bank_id": app["bank_id"],
            "bank_name": b_name,
            "status": app["status"],
            "created_at": app["created_at"],
            "updated_at": app["updated_at"],
            "timeline": app.get("timeline", [])
        }

def update_application_status_by_bank(bank_id: str, application_id: str, new_status: ApplicationStatus, message: Optional[str] = None):
    with _lock:
        app = applications_index.get(application_id)
        if not app:
            raise KeyError(f"Application '{application_id}' not found.")
        if app["bank_id"] != bank_id:
            raise PermissionError(f"Bank '{bank_id}' is not authorized to update application '{application_id}' belonging to '{app['bank_id']}'.")
        
        now_str = _now()
        app["status"] = new_status.value
        app["updated_at"] = now_str
        
        timeline_entry = {
            "status": new_status.value,
            "at": now_str,
            "message": message or f"Status updated to {new_status.value}"
        }
        app.setdefault("timeline", []).append(timeline_entry)
        try:
            persist_application(app)
        except Exception:
            pass
        
        # Auto-create notification for customer (Contract Section 4)
        add_notification(
            application_id=application_id,
            customer_id=app["customer_id"],
            type_=NotificationType.STATUS_CHANGED.value,
            message=message or f"Your application {application_id} status changed to {new_status.value}."
        )
        audit(actor=bank_id, action="STATUS_UPDATED", detail=f"App: {application_id} -> {new_status.value}")

def add_bank_notification_for_app(bank_id: str, application_id: str, notif_type: NotificationType, message: str):
    with _lock:
        app = applications_index.get(application_id)
        if not app:
            raise KeyError(f"Application '{application_id}' not found.")
        if app["bank_id"] != bank_id:
            raise PermissionError("Not authorized for this application.")
        
        add_notification(
            application_id=application_id,
            customer_id=app["customer_id"],
            type_=notif_type.value,
            message=message
        )

# ── Notifications for Customer ─────────────────────────────────────────────────

def get_customer_notifications(customer_id: str) -> List[Dict[str, Any]]:
    with _lock:
        res = [n for n in notifications if n["customer_id"] == customer_id]
        res.sort(key=lambda x: x["created_at"], reverse=True)
        return res

def mark_notification_read(notification_id: int, customer_id: str):
    with _lock:
        for n in notifications:
            if n["id"] == notification_id:
                if n["customer_id"] != customer_id:
                    raise PermissionError("Not authorized.")
                n["read"] = True
                try:
                    db_mark_notification_as_read(notification_id)
                except Exception:
                    pass
                return
        raise KeyError("Notification not found.")

# ── Fraud Registry Service (FROZEN Section 7) ──────────────────────────────────

def normalize_protected_id(p_id: str) -> str:
    p_clean = (p_id or "").strip()
    if len(p_clean) == 64 and all(c in '0123456789abcdefABCDEF' for c in p_clean):
        return p_clean.lower()
    return hashlib.sha256(p_clean.encode()).hexdigest()

def evaluate_fraud_registry(bank_id: str, protected_id: str, application_id: str) -> Tuple[FraudStatus, int, List[str]]:
    """
    Implements Section 7 FROZEN Fraud Design:
    Head Office additive rules (capped at 100):
      flag_count >= 1: +40 pts
      flag_count >= 3: +30 more pts
      Seen at different bank in last 30 days: +35 pts
      >= 3 distinct applications in last 30 days: +30 pts
    Fixed reasons:
      "Previously flagged identifier"
      "Repeatedly flagged identifier"
      "Identifier seen at another bank recently"
      "Multiple recent applications"
    """
    protected_id = normalize_protected_id(protected_id)
    application_id = application_id or "APP-GENERAL"
    now_dt = _now_dt()
    now_str = now_dt.isoformat()
    cutoff_30d = now_dt - timedelta(days=30)
    
    with _lock:
        reg_entry = fraud_registry.get(protected_id)
        if not reg_entry:
            reg_entry = {
                "protected_id": protected_id,
                "status": FraudStatus.SAFE.value,
                "flag_count": 0,
                "first_seen": now_str,
                "last_seen": now_str
            }
            fraud_registry[protected_id] = reg_entry
        else:
            reg_entry["last_seen"] = now_str
        
        # Sighting registration (one per application_id, ignore repeats for same app)
        already_sighted = any(
            s["protected_id"] == protected_id and s["application_id"] == application_id
            for s in fraud_sightings
        )
        if not already_sighted:
            sighting_obj = {
                "protected_id": protected_id,
                "bank_id": bank_id,
                "application_id": application_id,
                "seen_at": now_str
            }
            fraud_sightings.append(sighting_obj)
            try:
                persist_fraud_sighting(sighting_obj)
            except Exception:
                pass
        
        # Calculate sightings in last 30 days
        recent_sightings = [
            s for s in fraud_sightings
            if s["protected_id"] == protected_id and datetime.fromisoformat(s["seen_at"]) >= cutoff_30d
        ]
        
        # Seen at different bank in last 30 days
        diff_bank = any(s["bank_id"] != bank_id for s in recent_sightings)
        
        # Distinct applications in last 30 days
        distinct_apps = len(set(s["application_id"] for s in recent_sightings))
        
        # Compute points & reasons
        points = 0
        reasons = []
        flag_count = reg_entry["flag_count"]
        
        if flag_count >= 1:
            points += 40
            reasons.append("Previously flagged identifier")
        if flag_count >= 3:
            points += 30
            reasons.append("Repeatedly flagged identifier")
        if diff_bank:
            points += 35
            reasons.append("Identifier seen at another bank recently")
        if distinct_apps >= 3:
            points += 30
            reasons.append("Multiple recent applications")
        
        registry_score = min(100, points)
        
        # Status mapping
        if registry_score <= 30:
            status = FraudStatus.SAFE
        elif registry_score <= 60:
            status = FraudStatus.REVIEW_NEEDED
        else:
            status = FraudStatus.SUSPICIOUS
        
        reg_entry["status"] = status.value
        try:
            persist_fraud_registry(reg_entry)
        except Exception:
            pass
        audit(actor=bank_id, action="FRAUD_CHECK", detail=f"Score: {registry_score}, Status: {status.value}")
        return status, registry_score, reasons

def flag_fraud_identifier(bank_id: str, protected_id: str, application_id: str, reason: str) -> Tuple[int, FraudStatus]:
    protected_id = normalize_protected_id(protected_id)
    application_id = application_id or "APP-GENERAL"
    now_str = _now()
    with _lock:
        reg_entry = fraud_registry.get(protected_id)
        if not reg_entry:
            reg_entry = {
                "protected_id": protected_id,
                "status": FraudStatus.REVIEW_NEEDED.value,
                "flag_count": 1,
                "first_seen": now_str,
                "last_seen": now_str
            }
            fraud_registry[protected_id] = reg_entry
        else:
            reg_entry["flag_count"] += 1
            reg_entry["last_seen"] = now_str
        
        flag_count = reg_entry["flag_count"]
        status = FraudStatus.SUSPICIOUS if flag_count >= 2 else FraudStatus.REVIEW_NEEDED
        reg_entry["status"] = status.value
        try:
            persist_fraud_registry(reg_entry)
        except Exception:
            pass
        
        audit(actor=bank_id, action="FRAUD_FLAGGED", detail=f"App: {application_id}, Count: {flag_count}, Reason: {reason}")
        return flag_count, status

def list_fraud_alerts() -> List[Dict[str, Any]]:
    with _lock:
        alerts = []
        for p_id, data in fraud_registry.items():
            if data["status"] in (FraudStatus.REVIEW_NEEDED.value, FraudStatus.SUSPICIOUS.value) or data["flag_count"] > 0:
                sightings = [s for s in fraud_sightings if s["protected_id"] == p_id]
                banks_seen = list(set(s["bank_id"] for s in sightings))
                alerts.append({
                    "protected_id": p_id,
                    "status": data["status"],
                    "flag_count": data["flag_count"],
                    "first_seen": data["first_seen"],
                    "last_seen": data["last_seen"],
                    "sightings_count": len(sightings),
                    "recent_banks": banks_seen
                })
        alerts.sort(key=lambda x: x["flag_count"], reverse=True)
        return alerts

# ── Training & Model Services ──────────────────────────────────────────────────

def get_training_status() -> Dict[str, Any]:
    with _lock:
        return {
            "state": fl_state["state"],
            "round": fl_state["round"],
            "total_rounds": fl_state["total_rounds"],
            "global_accuracy": fl_state["global_accuracy"],
            "model_version": fl_state["model_version"],
            "banks_connected": fl_state["banks_connected"]
        }

def get_latest_global_model() -> Dict[str, Any]:
    with _lock:
        return {
            "model_version": global_model["version"],
            "coef": global_model["coef"],
            "intercept": global_model["intercept"]
        }

def update_global_model_after_round(round_num: int, coef: List[List[float]], intercept: List[float], accuracy: Optional[float]):
    with _lock:
        version_str = f"v{round_num}"
        global_model["version"] = version_str
        global_model["coef"] = coef
        global_model["intercept"] = intercept
        global_model["updated_at"] = _now()
        
        fl_state["round"] = round_num
        fl_state["model_version"] = version_str
        if accuracy is not None:
            fl_state["global_accuracy"] = round(accuracy * 100, 2)
        
        training_logs.append({
            "round": round_num,
            "accuracy": fl_state["global_accuracy"],
            "model_version": version_str,
            "timestamp": _now()
        })
        try:
            persist_global_model(version_str, coef, intercept)
            persist_training_log(round_num, fl_state["global_accuracy"], len(fl_state.get("banks_connected", [])))
        except Exception:
            pass

        try:
            import os, json
            models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
            os.makedirs(models_dir, exist_ok=True)
            payload = {
                "version": version_str,
                "round": round_num,
                "coef": coef,
                "intercept": intercept,
                "accuracy": fl_state["global_accuracy"],
                "updated_at": _now()
            }
            with open(os.path.join(models_dir, f"global_{version_str}.json"), "w") as f:
                json.dump(payload, f, indent=2)
            with open(os.path.join(models_dir, "global_latest.json"), "w") as f:
                json.dump(payload, f, indent=2)
        except Exception:
            pass

        audit(actor="FLOWER_FEDAVG", action="ROUND_COMPLETED", detail=f"Round {round_num}, Accuracy: {fl_state['global_accuracy']}%")

def set_training_state(new_state: TrainingState):
    with _lock:
        fl_state["state"] = new_state.value
        audit(actor="ADMIN", action="TRAINING_STATE_CHANGE", detail=new_state.value)
