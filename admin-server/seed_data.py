"""
Seed data script for FedCredit Head Office (fedcredit.db).
Populates realistic demo applications, fraud sightings, historical FL rounds,
and audit logs so the Head Office dashboard renders rich analytics immediately.

Usage:
    python seed_data.py
"""
import os
import json
import hashlib
from datetime import datetime, timezone, timedelta

from database import (
    init_db, _get_connection, _hash_key,
    admins, customers_auth, banks, applications_index,
    fraud_registry, fraud_sightings, training_logs, global_model, audit_logs
)
from auth import hash_password

def _now_iso(days: int = 0, hours: int = 0) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days, hours=hours)
    return dt.isoformat()

def seed_all():
    print("[Seed] Initializing database schema...")
    init_db()
    conn = _get_connection()
    cur = conn.cursor()

    # 1. Admin Account
    admin_pwd_hash = hash_password("adminpassword")
    cur.execute("""
        INSERT OR REPLACE INTO admins (id, username, hashed_password, role, created_at)
        VALUES (1, 'admin_main', ?, 'admin', ?)
    """, (admin_pwd_hash, _now_iso(days=10)))

    # 2. Bank Nodes
    cur.execute("""
        INSERT OR REPLACE INTO banks (bank_id, name, api_base_url, api_key_hash, online, last_heartbeat)
        VALUES ('BANK_A', 'HDFC Retail Bank (Bank A)', 'http://127.0.0.1:8001/api', ?, 1, ?)
    """, (_hash_key("bank_a_dev_key_change_in_prod"), _now_iso(hours=0)))

    cur.execute("""
        INSERT OR REPLACE INTO banks (bank_id, name, api_base_url, api_key_hash, online, last_heartbeat)
        VALUES ('BANK_B', 'State Co-op Bank (Bank B)', 'http://127.0.0.1:8002/api', ?, 1, ?)
    """, (_hash_key("bank_b_dev_key_change_in_prod"), _now_iso(hours=0)))

    # 3. Customer Accounts
    customers = [
        ("CUST-000001", "Ramesh Sharma", "ramesh@example.com", "+91 98201 12345", hash_password("Password123!")),
        ("CUST-000002", "Priya Patel", "priya@example.com", "+91 98202 23456", hash_password("Password123!")),
        ("CUST-000003", "Amit Verma", "amit@example.com", "+91 98203 34567", hash_password("Password123!")),
        ("CUST-000004", "Sneha Kulkarni", "sneha@example.com", "+91 98204 45678", hash_password("Password123!")),
        ("CUST-000005", "Vikram Singh", "vikram@example.com", "+91 98205 56789", hash_password("Password123!"))
    ]
    for cid, name, email, phone, pwd_hash in customers:
        cur.execute("""
            INSERT OR REPLACE INTO customers_auth (customer_id, name, email, phone, hashed_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (cid, name, email, phone, pwd_hash, _now_iso(days=7)))

    # 4. Loan Applications Index
    apps = [
        (
            "APP-2026-000001", "CUST-000001", "BANK_A", "APPROVED",
            json.dumps([
                {"status": "SUBMITTED", "at": _now_iso(days=4), "message": "Application submitted to Bank A"},
                {"status": "UNDER_REVIEW", "at": _now_iso(days=3), "message": "Risk assessment completed via FL Model v3"},
                {"status": "APPROVED", "at": _now_iso(days=2), "message": "Loan sanctioned for ₹650,000"}
            ]),
            _now_iso(days=4), _now_iso(days=2)
        ),
        (
            "APP-2026-000002", "CUST-000002", "BANK_A", "UNDER_REVIEW",
            json.dumps([
                {"status": "SUBMITTED", "at": _now_iso(days=2), "message": "Application submitted to Bank A"},
                {"status": "UNDER_REVIEW", "at": _now_iso(days=1), "message": "Preliminary document verification passed"}
            ]),
            _now_iso(days=2), _now_iso(days=1)
        ),
        (
            "APP-2026-000003", "CUST-000003", "BANK_B", "VERIFICATION_REQUIRED",
            json.dumps([
                {"status": "SUBMITTED", "at": _now_iso(days=3), "message": "Application submitted to Bank B"},
                {"status": "UNDER_REVIEW", "at": _now_iso(days=2), "message": "Address mismatch detected"},
                {"status": "VERIFICATION_REQUIRED", "at": _now_iso(days=1), "message": "Please provide utility bill or latest ITR"}
            ]),
            _now_iso(days=3), _now_iso(days=1)
        ),
        (
            "APP-2026-000004", "CUST-000004", "BANK_B", "REJECTED",
            json.dumps([
                {"status": "SUBMITTED", "at": _now_iso(days=5), "message": "Application submitted to Bank B"},
                {"status": "UNDER_REVIEW", "at": _now_iso(days=4), "message": "Credit bureau score 540 below minimum threshold"},
                {"status": "REJECTED", "at": _now_iso(days=3), "message": "Application does not meet current credit criteria"}
            ]),
            _now_iso(days=5), _now_iso(days=3)
        ),
        (
            "APP-2026-000005", "CUST-000005", "BANK_A", "SUBMITTED",
            json.dumps([
                {"status": "SUBMITTED", "at": _now_iso(hours=3), "message": "Application received and queued for evaluation"}
            ]),
            _now_iso(hours=3), _now_iso(hours=3)
        )
    ]
    for app_id, cust_id, bank_id, stat, timeline, created, updated in apps:
        cur.execute("""
            INSERT OR REPLACE INTO applications_index (application_id, customer_id, bank_id, status, timeline, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (app_id, cust_id, bank_id, stat, timeline, created, updated))

    # 5. Customer Notifications
    notifs = [
        ("APP-2026-000001", "CUST-000001", "STATUS_CHANGED", "Congratulations! Your loan application APP-2026-000001 has been APPROVED.", 1, _now_iso(days=2)),
        ("APP-2026-000003", "CUST-000003", "DOCUMENT_REQUESTED", "Action Required: Bank B requested proof of address for APP-2026-000003.", 0, _now_iso(days=1)),
        ("APP-2026-000004", "CUST-000004", "STATUS_CHANGED", "Your loan application APP-2026-000004 status updated to REJECTED.", 1, _now_iso(days=3)),
        ("APP-2026-000005", "CUST-000005", "STATUS_CHANGED", "Your loan application APP-2026-000005 was submitted successfully.", 0, _now_iso(hours=3))
    ]
    for app_id, cust_id, ntype, msg, read, created in notifs:
        cur.execute("""
            INSERT INTO notifications (application_id, customer_id, type, message, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (app_id, cust_id, ntype, msg, read, created))

    # 6. Fraud Registry and Sightings
    # Synthetic SHA-256 protected IDs
    id_sus = hashlib.sha256(b"DEMO_FRAUD_PAN_ABCDE1234F").hexdigest()
    id_rev = hashlib.sha256(b"DEMO_SUSPECT_PHONE_9876543210").hexdigest()
    id_safe = hashlib.sha256(b"DEMO_REGULAR_ID_RAMESH_SHARMA").hexdigest()

    cur.execute("""
        INSERT OR REPLACE INTO fraud_registry (protected_id, status, flag_count, first_seen, last_seen)
        VALUES (?, 'SUSPICIOUS', 3, ?, ?)
    """, (id_sus, _now_iso(days=15), _now_iso(hours=2)))

    cur.execute("""
        INSERT OR REPLACE INTO fraud_registry (protected_id, status, flag_count, first_seen, last_seen)
        VALUES (?, 'REVIEW_NEEDED', 1, ?, ?)
    """, (id_rev, _now_iso(days=5), _now_iso(days=1)))

    cur.execute("""
        INSERT OR REPLACE INTO fraud_registry (protected_id, status, flag_count, first_seen, last_seen)
        VALUES (?, 'SAFE', 0, ?, ?)
    """, (id_safe, _now_iso(days=4), _now_iso(days=4)))

    # Sightings for id_sus across both Bank A and Bank B
    cur.execute("""
        INSERT INTO fraud_sightings (protected_id, bank_id, application_id, seen_at)
        VALUES (?, 'BANK_A', 'APP-2026-000088', ?)
    """, (id_sus, _now_iso(days=12)))
    cur.execute("""
        INSERT INTO fraud_sightings (protected_id, bank_id, application_id, seen_at)
        VALUES (?, 'BANK_B', 'APP-2026-000092', ?)
    """, (id_sus, _now_iso(days=4)))
    cur.execute("""
        INSERT INTO fraud_sightings (protected_id, bank_id, application_id, seen_at)
        VALUES (?, 'BANK_A', 'APP-2026-000099', ?)
    """, (id_sus, _now_iso(hours=2)))

    # Sightings for id_rev
    cur.execute("""
        INSERT INTO fraud_sightings (protected_id, bank_id, application_id, seen_at)
        VALUES (?, 'BANK_B', 'APP-2026-000075', ?)
    """, (id_rev, _now_iso(days=1)))

    # 7. Federated Learning Training Logs
    cur.execute("""
        INSERT OR REPLACE INTO training_logs (round, accuracy, bank_count, timestamp)
        VALUES (1, 84.2, 2, ?)
    """, (_now_iso(days=3),))
    cur.execute("""
        INSERT OR REPLACE INTO training_logs (round, accuracy, bank_count, timestamp)
        VALUES (2, 89.5, 2, ?)
    """, (_now_iso(days=2),))
    cur.execute("""
        INSERT OR REPLACE INTO training_logs (round, accuracy, bank_count, timestamp)
        VALUES (3, 93.1, 2, ?)
    """, (_now_iso(days=1),))

    # 8. Global FL Model v3 (17-feature logistic regression weights)
    # 17 features: person_age, person_income, person_home_ownership, person_emp_length,
    # loan_intent, loan_grade, loan_amnt, loan_int_rate, loan_percent_income,
    # cb_person_default_on_file, cb_person_cred_hist_length, + encoded dummies
    sample_coef = [[
        -0.034, -0.000012, 0.45, -0.052, 0.22, 0.81, 0.000045, 0.112,
        2.35, 0.65, -0.018, 0.12, -0.08, 0.04, -0.15, 0.28, -0.05
    ]]
    sample_intercept = [-1.45]

    cur.execute("""
        INSERT OR REPLACE INTO global_model (version, coef, intercept, updated_at)
        VALUES ('v3', ?, ?, ?)
    """, (json.dumps(sample_coef), json.dumps(sample_intercept), _now_iso(days=1)))

    # 9. Audit Logs
    audit_events = [
        ("admin_main", "ADMIN_LOGIN", "Central Admin Console started", _now_iso(days=3)),
        ("FLOWER_FEDAVG", "ROUND_COMPLETED", "Round 1 completed with 2 banks. Global accuracy: 84.2%", _now_iso(days=3)),
        ("BANK_A", "HEARTBEAT", "Node online: http://127.0.0.1:8001/api", _now_iso(days=2)),
        ("FLOWER_FEDAVG", "ROUND_COMPLETED", "Round 2 completed with 2 banks. Global accuracy: 89.5%", _now_iso(days=2)),
        ("BANK_B", "FRAUD_CHECK", "Registry check for protected identifier. Score: 75 (SUSPICIOUS)", _now_iso(days=1)),
        ("FLOWER_FEDAVG", "ROUND_COMPLETED", "Round 3 completed with 2 banks. Global accuracy: 93.1%", _now_iso(days=1)),
        ("BANK_A", "STATUS_UPDATED", "APP-2026-000001 -> APPROVED", _now_iso(days=1)),
        ("BANK_B", "STATUS_UPDATED", "APP-2026-000004 -> REJECTED", _now_iso(days=1)),
        ("admin_main", "ADMIN_LOGIN", "Live dashboard session active", _now_iso(hours=1))
    ]
    for actor, action, detail, ts in audit_events:
        cur.execute("""
            INSERT INTO audit_logs (actor, action, detail, timestamp)
            VALUES (?, ?, ?, ?)
        """, (actor, action, detail, ts))

    conn.commit()
    conn.close()

    # 10. Archive Models on Disk
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    rounds_data = [
        (1, 84.2, [[-0.02, -0.00001, 0.35, -0.04, 0.18, 0.65, 0.00003, 0.09, 1.8, 0.5, -0.01, 0.1, -0.05, 0.03, -0.1, 0.2, -0.03]], [-1.1]),
        (2, 89.5, [[-0.028, -0.000011, 0.40, -0.048, 0.20, 0.74, 0.00004, 0.105, 2.1, 0.58, -0.015, 0.11, -0.07, 0.035, -0.13, 0.25, -0.04]], [-1.3]),
        (3, 93.1, sample_coef, sample_intercept),
    ]
    for r_num, acc, c, inter in rounds_data:
        m_payload = {
            "version": f"v{r_num}",
            "round": r_num,
            "coef": c,
            "intercept": inter,
            "accuracy": acc,
            "updated_at": _now_iso(days=4-r_num)
        }
        with open(os.path.join(models_dir, f"global_v{r_num}.json"), "w") as f:
            json.dump(m_payload, f, indent=2)
        if r_num == 3:
            with open(os.path.join(models_dir, "global_latest.json"), "w") as f:
                json.dump(m_payload, f, indent=2)

    print("[Seed] Successfully populated SQLite database and archived global models!")

if __name__ == "__main__":
    seed_all()
