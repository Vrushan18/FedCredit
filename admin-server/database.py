"""
Database persistence layer for FedCredit Head Office (fedcredit_db).
Implements thread-safe SQLite persistence (fedcredit.db) matching the PostgreSQL schema.
Mirrors all tables defined in Section 4 & 5 of the Team Contract and Section 7 of the Master Guide.

Tables:
  admins              — id, username, hashed_password, role, created_at
  customers_auth      — customer_id, name, email, phone, hashed_password, created_at
  banks               — bank_id, name, api_base_url, api_key_hash, online, last_heartbeat
  applications_index  — application_id, customer_id, bank_id, status, timeline, created_at, updated_at
  notifications       — id, application_id, customer_id, type, message, read, created_at
  fraud_registry      — protected_id, status, flag_count, first_seen, last_seen
  fraud_sightings     — id, protected_id, bank_id, application_id, seen_at
  training_logs       — round, accuracy, bank_count, timestamp
  global_model        — version, coef, intercept, updated_at
  audit_logs          — id, actor, action, detail, timestamp
"""

import os
import json
import sqlite3
import hashlib
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_lock = threading.RLock()
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fedcredit.db")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_connection():
    conn = sqlite3.connect(DB_FILE, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes SQLite schema and creates tables if they do not exist."""
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                created_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS customers_auth (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS banks (
                bank_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_base_url TEXT NOT NULL,
                api_key_hash TEXT NOT NULL,
                online INTEGER NOT NULL DEFAULT 0,
                last_heartbeat TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS applications_index (
                application_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                bank_id TEXT NOT NULL,
                status TEXT NOT NULL,
                timeline TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS fraud_registry (
                protected_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                flag_count INTEGER NOT NULL DEFAULT 0,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS fraud_sightings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                protected_id TEXT NOT NULL,
                bank_id TEXT NOT NULL,
                application_id TEXT NOT NULL,
                seen_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_logs (
                round INTEGER PRIMARY KEY,
                accuracy REAL,
                bank_count INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS global_model (
                version TEXT PRIMARY KEY,
                coef TEXT NOT NULL,
                intercept TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT,
                timestamp TEXT NOT NULL
            )
        """)

        # Ensure default Bank records exist
        cur.execute("SELECT COUNT(*) FROM banks")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO banks (bank_id, name, api_base_url, api_key_hash, online, last_heartbeat)
                VALUES (?, ?, ?, ?, 0, NULL)
            """, ("BANK_A", "HDFC Retail Bank (Bank A)", "http://127.0.0.1:8001/api", _hash_key("bank_a_dev_key_change_in_prod")))
            cur.execute("""
                INSERT INTO banks (bank_id, name, api_base_url, api_key_hash, online, last_heartbeat)
                VALUES (?, ?, ?, ?, 0, NULL)
            """, ("BANK_B", "State Co-op Bank (Bank B)", "http://127.0.0.1:8002/api", _hash_key("bank_b_dev_key_change_in_prod")))

        conn.commit()
        conn.close()


# Initialize database on module load
init_db()


# ── In-Memory Cached Stores (Synced with SQLite for high performance) ─────────

admins: Dict[str, dict] = {}
customers_auth: Dict[str, dict] = {}
customers_by_email: Dict[str, str] = {}
banks: Dict[str, dict] = {}
applications_index: Dict[str, dict] = {}
notifications: List[dict] = []
fraud_registry: Dict[str, dict] = {}
fraud_sightings: List[dict] = []
training_logs: List[dict] = []
audit_logs: List[dict] = []

fl_state: Dict[str, Any] = {
    "state": "IDLE",
    "round": 0,
    "total_rounds": 5,
    "global_accuracy": None,
    "model_version": "v0",
    "banks_connected": [],
}

global_model: Dict[str, Any] = {
    "version": "v0",
    "coef": [[0.0] * 17],
    "intercept": [0.0],
    "updated_at": _now(),
}

_notif_counter = 0
_audit_counter = 0


def load_from_db():
    """Loads existing persisted rows from SQLite into active in-memory caches."""
    global _notif_counter, _audit_counter
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()

        # Load admins
        for row in cur.execute("SELECT * FROM admins"):
            admins[row["username"]] = dict(row)

        # Load customers
        for row in cur.execute("SELECT * FROM customers_auth"):
            d = dict(row)
            customers_auth[d["customer_id"]] = d
            customers_by_email[d["email"]] = d["customer_id"]

        # Load banks
        for row in cur.execute("SELECT * FROM banks"):
            d = dict(row)
            d["online"] = bool(d["online"])
            banks[d["bank_id"]] = d

        # Load applications
        for row in cur.execute("SELECT * FROM applications_index"):
            d = dict(row)
            d["timeline"] = json.loads(d["timeline"]) if d["timeline"] else []
            applications_index[d["application_id"]] = d

        # Load notifications
        del notifications[:]
        for row in cur.execute("SELECT * FROM notifications ORDER BY id ASC"):
            d = dict(row)
            d["read"] = bool(d["read"])
            notifications.append(d)
            _notif_counter = max(_notif_counter, d["id"])

        # Load fraud registry
        for row in cur.execute("SELECT * FROM fraud_registry"):
            fraud_registry[row["protected_id"]] = dict(row)

        # Load sightings
        del fraud_sightings[:]
        for row in cur.execute("SELECT * FROM fraud_sightings ORDER BY id ASC"):
            fraud_sightings.append(dict(row))

        # Load training logs
        del training_logs[:]
        for row in cur.execute("SELECT * FROM training_logs ORDER BY round ASC"):
            training_logs.append(dict(row))

        # Load global model
        cur.execute("SELECT * FROM global_model ORDER BY updated_at DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            global_model["version"] = row["version"]
            global_model["coef"] = json.loads(row["coef"])
            global_model["intercept"] = json.loads(row["intercept"])
            global_model["updated_at"] = row["updated_at"]
            fl_state["model_version"] = row["version"]

        # Load audit logs
        del audit_logs[:]
        for row in cur.execute("SELECT * FROM audit_logs ORDER BY id ASC"):
            audit_logs.append(dict(row))
            _audit_counter = max(_audit_counter, row["id"])

        conn.close()


# Initial cache hydration
load_from_db()


# ── Persistence Helpers ────────────────────────────────────────────────────────

def persist_admin(username: str, hashed_password: str, role: str = "admin", name: str = ""):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO admins (username, hashed_password, role, created_at)
            VALUES (?, ?, ?, ?)
        """, (username, hashed_password, role, _now()))
        conn.commit()
        conn.close()


def persist_customer(customer_id: str, name: str, email: str, phone: str, hashed_password: str):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO customers_auth (customer_id, name, email, phone, hashed_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (customer_id, name, email, phone, hashed_password, _now()))
        conn.commit()
        conn.close()


def persist_application(app_data: dict):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO applications_index (application_id, customer_id, bank_id, status, timeline, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            app_data["application_id"],
            app_data["customer_id"],
            app_data["bank_id"],
            app_data["status"],
            json.dumps(app_data.get("timeline", [])),
            app_data["created_at"],
            app_data["updated_at"]
        ))
        conn.commit()
        conn.close()


def persist_notification(notif: dict):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO notifications (application_id, customer_id, type, message, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            notif["application_id"],
            notif["customer_id"],
            notif["type"],
            notif["message"],
            int(notif["read"]),
            notif["created_at"]
        ))
        notif["id"] = cur.lastrowid
        conn.commit()
        conn.close()


def mark_notification_as_read(notif_id: int):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET read = 1 WHERE id = ?", (notif_id,))
        conn.commit()
        conn.close()


def persist_bank_heartbeat(bank_id: str, api_base_url: str, last_heartbeat: str):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE banks
            SET api_base_url = ?, last_heartbeat = ?, online = 1
            WHERE bank_id = ?
        """, (api_base_url, last_heartbeat, bank_id))
        conn.commit()
        conn.close()


def persist_fraud_registry(entry: dict):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO fraud_registry (protected_id, status, flag_count, first_seen, last_seen)
            VALUES (?, ?, ?, ?, ?)
        """, (
            entry["protected_id"],
            entry["status"],
            entry["flag_count"],
            entry["first_seen"],
            entry["last_seen"]
        ))
        conn.commit()
        conn.close()


def persist_fraud_sighting(sighting: dict):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO fraud_sightings (protected_id, bank_id, application_id, seen_at)
            VALUES (?, ?, ?, ?)
        """, (
            sighting["protected_id"],
            sighting["bank_id"],
            sighting["application_id"],
            sighting["seen_at"]
        ))
        conn.commit()
        conn.close()


def persist_training_log(round_num: int, accuracy: Optional[float], bank_count: int):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO training_logs (round, accuracy, bank_count, timestamp)
            VALUES (?, ?, ?, ?)
        """, (round_num, accuracy, bank_count, _now()))
        conn.commit()
        conn.close()


def persist_global_model(version: str, coef: list, intercept: list):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO global_model (version, coef, intercept, updated_at)
            VALUES (?, ?, ?, ?)
        """, (version, json.dumps(coef), json.dumps(intercept), _now()))
        conn.commit()
        conn.close()


def persist_audit_log(entry: dict):
    with _lock:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_logs (actor, action, detail, timestamp)
            VALUES (?, ?, ?, ?)
        """, (entry["actor"], entry["action"], entry["detail"], entry["timestamp"]))
        entry["id"] = cur.lastrowid
        conn.commit()
        conn.close()


def add_notification(application_id: str, customer_id: str, type_: str, message: str) -> dict:
    global _notif_counter
    with _lock:
        _notif_counter += 1
        notif = {
            "id": _notif_counter,
            "application_id": application_id,
            "customer_id": customer_id,
            "type": type_,
            "message": message,
            "read": False,
            "created_at": _now(),
        }
        notifications.append(notif)
        try:
            persist_notification(notif)
        except Exception:
            pass
    return notif


def audit(actor: str, action: str, detail: str = "") -> None:
    global _audit_counter
    with _lock:
        _audit_counter += 1
        entry = {
            "id": _audit_counter,
            "actor": actor,
            "action": action,
            "detail": detail,
            "timestamp": _now(),
        }
        audit_logs.append(entry)
        try:
            persist_audit_log(entry)
        except Exception:
            pass
