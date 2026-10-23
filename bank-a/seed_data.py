"""
Seed script for Bank A Local Node
Sets up initial bank staff credentials, sample customers, and loan applications
for demo testing and immediate verification.
"""

import os
import sys
import datetime

# Ensure Bank-A root in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import engine, Base, SessionLocal
from backend.models import Employee, Customer, LoanApplication, Prediction, LocalTrainingLog
from backend.auth import get_password_hash
from backend.fraud import generate_protected_id

def seed_database():
    print("Initializing Bank A database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Staff Employees
        existing_emp = db.query(Employee).filter(Employee.username == "officer").first()
        if not existing_emp:
            emp = Employee(
                username="officer",
                hashed_password=get_password_hash("password123"),
                role="LOAN_OFFICER"
            )
            admin = Employee(
                username="manager",
                hashed_password=get_password_hash("manager123"),
                role="BRANCH_MANAGER"
            )
            db.add_all([emp, admin])
            print("Created default staff accounts: officer/password123, manager/manager123")

        # 2. Seed Sample Customers & Applications
        sample_apps = [
            {
                "customer_id": "CUST-000101",
                "application_id": "APP-2026-000101",
                "name": "Rahul Sharma",
                "age": 36,
                "gender": "MALE",
                "address": "402 Royal Palms, Powai, Mumbai",
                "phone": "+91 98201 12345",
                "occupation": "Senior Software Architect",
                "employment_type": "SALARIED",
                "annual_income": 1850000.0,
                "existing_debt": 120000.0,
                "credit_score": 780,
                "home_ownership": "MORTGAGE",
                "employment_length_years": 8.5,
                "credit_history_length_years": 11.0,
                "previous_default": False,
                "loan_amount": 500000.0,
                "duration_months": 36,
                "purpose": "HOME_IMPROVEMENT",
                "status": "SUBMITTED",
                "fingerprint_seed": b"rahul_fp_bytes_001"
            },
            {
                "customer_id": "CUST-000102",
                "application_id": "APP-2026-000102",
                "name": "Priya Nair",
                "age": 28,
                "gender": "FEMALE",
                "address": "12 Green Glen Layout, Bellandur, Bengaluru",
                "phone": "+91 97412 56789",
                "occupation": "Product Marketing Lead",
                "employment_type": "SALARIED",
                "annual_income": 1200000.0,
                "existing_debt": 250000.0,
                "credit_score": 710,
                "home_ownership": "RENT",
                "employment_length_years": 4.0,
                "credit_history_length_years": 6.0,
                "previous_default": False,
                "loan_amount": 450000.0,
                "duration_months": 24,
                "purpose": "PERSONAL",
                "status": "SUBMITTED",
                "fingerprint_seed": b"priya_fp_bytes_002"
            },
            {
                "customer_id": "CUST-000103",
                "application_id": "APP-2026-000103",
                "name": "Amit Patel",
                "age": 42,
                "gender": "MALE",
                "address": "Plot 88, Sector 17, Gandhinagar, Gujarat",
                "phone": "+91 94260 88990",
                "occupation": "Hardware Retailer",
                "employment_type": "BUSINESS",
                "annual_income": 720000.0,
                "existing_debt": 480000.0,
                "credit_score": 620,
                "home_ownership": "OWN",
                "employment_length_years": 12.0,
                "credit_history_length_years": 9.0,
                "previous_default": False,
                "loan_amount": 600000.0,
                "duration_months": 48,
                "purpose": "VENTURE",
                "status": "SUBMITTED",
                "fingerprint_seed": b"amit_fp_bytes_003"
            },
            {
                "customer_id": "CUST-000104",
                "application_id": "APP-2026-000104",
                "name": "Vikram Singh",
                "age": 24,
                "gender": "MALE",
                "address": "B-14 Malviya Nagar, Jaipur, Rajasthan",
                "phone": "+91 99820 44321",
                "occupation": "Junior Executive",
                "employment_type": "SALARIED",
                "annual_income": 360000.0,
                "existing_debt": 290000.0,
                "credit_score": 550,
                "home_ownership": "RENT",
                "employment_length_years": 1.2,
                "credit_history_length_years": 2.0,
                "previous_default": True,
                "loan_amount": 300000.0,
                "duration_months": 36,
                "purpose": "DEBT_CONSOLIDATION",
                "status": "SUBMITTED",
                "fingerprint_seed": b"vikram_fp_bytes_004"
            }
        ]

        for s in sample_apps:
            cust = db.query(Customer).filter(Customer.customer_id == s["customer_id"]).first()
            if not cust:
                cust = Customer(
                    customer_id=s["customer_id"],
                    name=s["name"],
                    age=s["age"],
                    gender=s["gender"],
                    address=s["address"],
                    phone=s["phone"],
                    occupation=s["occupation"],
                    employment_type=s["employment_type"]
                )
                db.add(cust)

            app = db.query(LoanApplication).filter(LoanApplication.application_id == s["application_id"]).first()
            if not app:
                prot_id = generate_protected_id(s["fingerprint_seed"])
                app = LoanApplication(
                    application_id=s["application_id"],
                    customer_id=s["customer_id"],
                    annual_income=s["annual_income"],
                    existing_debt=s["existing_debt"],
                    credit_score=s["credit_score"],
                    home_ownership=s["home_ownership"],
                    employment_length_years=s["employment_length_years"],
                    credit_history_length_years=s["credit_history_length_years"],
                    previous_default=s["previous_default"],
                    loan_amount=s["loan_amount"],
                    duration_months=s["duration_months"],
                    purpose=s["purpose"],
                    applicant_name=s["name"],
                    applicant_age=s["age"],
                    applicant_gender=s["gender"],
                    applicant_address=s["address"],
                    applicant_phone=s["phone"],
                    applicant_occupation=s["occupation"],
                    applicant_employment_type=s["employment_type"],
                    protected_id=prot_id,
                    status=s["status"]
                )
                db.add(app)
        
        # 3. Seed an initial training log entry if empty
        log_cnt = db.query(LocalTrainingLog).count()
        if log_cnt == 0:
            db.add(LocalTrainingLog(
                round=1,
                local_loss=0.342,
                local_accuracy=0.871,
                num_samples=4800,
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
            ))

        db.commit()
        print(f"Seeded {len(sample_apps)} demo applications successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
