import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from passlib.context import CryptContext
from backend.database import engine, SessionLocal, Base
from backend.models import Employee, Customer, LoanApplication
from backend.config import logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_database():
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Default Bank B Employee
        existing_emp = db.query(Employee).filter(Employee.username == "admin_b").first()
        if not existing_emp:
            hashed_pwd = pwd_context.hash("password123")
            emp = Employee(username="admin_b", hashed_password=hashed_pwd, role="OFFICER")
            db.add(emp)
            logger.info("Seeded default Bank B employee: username='admin_b', password='password123'")

        # 2. Seed Sample Customer (Local Bank B KYC)
        cust_id = "CUST-000001"
        existing_cust = db.query(Customer).filter(Customer.customer_id == cust_id).first()
        if not existing_cust:
            cust = Customer(
                customer_id=cust_id,
                name="Sunita Sharma",
                age=38,
                gender="Female",
                address="74 Co-op Housing Society, Pune, MH",
                phone="+91-9823011223",
                occupation="Senior Accountant",
                employment_type="Salaried"
            )
            db.add(cust)
            logger.info("Seeded sample customer: %s ('Sunita Sharma')", cust_id)

        # 3. Seed Sample Loan Application
        app_id = "APP-2026-000001"
        existing_app = db.query(LoanApplication).filter(LoanApplication.application_id == app_id).first()
        if not existing_app:
            app = LoanApplication(
                application_id=app_id,
                customer_id=cust_id,
                income=650000.0,
                employment_length_years=6.5,
                debt=12000.0,
                credit_score=710,
                loan_amount=250000.0,
                loan_purpose="PERSONAL",
                home_ownership="OWN",
                previous_default=0,
                status="SUBMITTED"
            )
            db.add(app)
            logger.info("Seeded sample loan application: %s ('PERSONAL', 250,000 INR)", app_id)

        # 4. Seed Jainam Jain KYC Customer Profile
        jainam_id = "CUST-000002"
        existing_jainam = db.query(Customer).filter(Customer.customer_id == jainam_id).first()
        if not existing_jainam:
            jainam = Customer(
                customer_id=jainam_id,
                name="Jainam Jain",
                age=29,
                gender="Male",
                address="142 MG Road, Shivajinagar, Pune, MH",
                phone="+91-9876543210",
                occupation="Senior Software Engineer",
                employment_type="Salaried"
            )
            db.add(jainam)
            logger.info("Seeded customer KYC: %s ('Jainam Jain')", jainam_id)

        # 5. Seed Jainam Jain Loan Application
        jainam_app_id = "APP-2026-000005"
        existing_jainam_app = db.query(LoanApplication).filter(LoanApplication.application_id == jainam_app_id).first()
        if not existing_jainam_app:
            jainam_app = LoanApplication(
                application_id=jainam_app_id,
                customer_id=jainam_id,
                income=1200000.0,
                employment_length_years=4.5,
                debt=45000.0,
                credit_score=780,
                loan_amount=500000.0,
                loan_purpose="PERSONAL",
                home_ownership="RENT",
                previous_default=0,
                status="UNDER_REVIEW"
            )
            db.add(jainam_app)
            logger.info("Seeded loan application: %s for Jainam Jain ('PERSONAL', 500,000 INR)", jainam_app_id)

        db.commit()
        logger.info("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        logger.error("Database seeding failed: %s", str(e))
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
