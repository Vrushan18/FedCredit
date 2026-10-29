from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db, is_postgres_active, engine
from backend.schemas import HealthResponse
from backend.config import settings

router = APIRouter(prefix="/api", tags=["Health Check"])

@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_status = "postgresql_active" if is_postgres_active else "sqlite_dev_fallback"
    
    # Verify DB connectivity
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "ok",
        "bank_id": settings.BANK_ID,
        "version": "1.0.0",
        "database_status": db_status,
        "head_office_mode": settings.HEAD_OFFICE_MODE,
        "flower_status": "standby"
    }
