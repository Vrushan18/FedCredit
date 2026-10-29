import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal, Base, engine
from backend.models import Employee, Customer, LoanApplication
from database.seed import seed_database

def setup_module(module):
    Base.metadata.create_all(bind=engine)
    seed_database()


def test_database_employee_record():
    db = SessionLocal()
    try:
        emp = db.query(Employee).filter(Employee.username == "admin_b").first()
        assert emp is not None
        assert emp.username == "admin_b"
        assert emp.role == "OFFICER"
    finally:
        db.close()

def test_database_customer_record():
    db = SessionLocal()
    try:
        cust = db.query(Customer).filter(Customer.customer_id == "CUST-000001").first()
        assert cust is not None
        assert cust.name == "Sunita Sharma"
        assert cust.occupation == "Senior Accountant"
    finally:
        db.close()

def test_database_loan_application_record():
    db = SessionLocal()
    try:
        app = db.query(LoanApplication).filter(LoanApplication.application_id == "APP-2026-000001").first()
        assert app is not None
        assert app.customer_id == "CUST-000001"
        assert app.loan_amount == 250000.0
        assert app.status == "SUBMITTED"
    finally:
        db.close()
