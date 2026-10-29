from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Customer, LoanApplication, Employee
from backend.dependencies import get_current_employee

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Statistics"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    total_customers = db.query(Customer).count()
    
    pending_applications = db.query(LoanApplication).filter(
        LoanApplication.status.in_(["SUBMITTED", "UNDER_REVIEW", "VERIFICATION_REQUIRED"])
    ).count()
    
    approved_loans = db.query(LoanApplication).filter(
        LoanApplication.status == "APPROVED"
    ).count()
    
    rejected_loans = db.query(LoanApplication).filter(
        LoanApplication.status == "REJECTED"
    ).count()

    today_start = datetime.combine(date.today(), datetime.min.time())
    todays_applications = db.query(LoanApplication).filter(
        LoanApplication.created_at >= today_start
    ).count()

    return {
        "total_customers": total_customers,
        "pending_applications": pending_applications,
        "approved_loans": approved_loans,
        "rejected_loans": rejected_loans,
        "todays_applications": todays_applications
    }
