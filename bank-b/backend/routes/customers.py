from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import Customer, LoanApplication, Employee
from backend.schemas import CustomerCreate, CustomerResponse, LoanApplicationResponse
from backend.dependencies import get_current_employee
from backend.config import logger

router = APIRouter(prefix="/api/customers", tags=["Customer Management"])

def generate_next_customer_id(db: Session) -> str:
    # Query last customer ID
    customers = db.query(Customer.customer_id).filter(Customer.customer_id.like("CUST-%")).all()
    max_id = 0
    for (c_id,) in customers:
        try:
            num = int(c_id.replace("CUST-", ""))
            if num > max_id:
                max_id = num
        except ValueError:
            continue
    return f"CUST-{(max_id + 1):06d}"

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    cust_id = generate_next_customer_id(db)
    customer = Customer(
        customer_id=cust_id,
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        address=payload.address,
        phone=payload.phone,
        occupation=payload.occupation,
        employment_type=payload.employment_type
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    logger.info("Customer %s created by employee %s", cust_id, current_employee.username)
    return customer

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None, description="Search term for name, phone, customer_id, occupation"),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    query = db.query(Customer)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.customer_id.ilike(search_term),
                Customer.name.ilike(search_term),
                Customer.phone.ilike(search_term),
                Customer.occupation.ilike(search_term)
            )
        )
    return query.order_by(Customer.created_at.desc()).all()

@router.get("/{customer_id}")
def get_customer_details(
    customer_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Customer with ID '{customer_id}' was not found."}
        )
    
    applications = db.query(LoanApplication).filter(LoanApplication.customer_id == customer_id).all()
    
    return {
        "customer": CustomerResponse.model_validate(customer),
        "applications": [LoanApplicationResponse.model_validate(app) for app in applications]
    }

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Customer with ID '{customer_id}' was not found."}
        )
    
    customer.name = payload.name
    customer.age = payload.age
    customer.gender = payload.gender
    customer.address = payload.address
    customer.phone = payload.phone
    customer.occupation = payload.occupation
    customer.employment_type = payload.employment_type

    db.commit()
    db.refresh(customer)
    logger.info("Customer %s updated by employee %s", customer_id, current_employee.username)
    return customer
