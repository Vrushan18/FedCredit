"""
Bank B ML Prediction API Router.
Provides prediction execution and prediction history retrieval endpoints.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import LoanApplication, Prediction, Employee
from backend.dependencies import get_current_employee
from ml.predict import PredictionService
from ml.preprocessing import DatasetBlockerException
from backend.config import logger

router = APIRouter(prefix="/api/applications", tags=["ML Predictions Engine"])
prediction_service = PredictionService()


@router.post("/{application_id}/predict", status_code=status.HTTP_200_OK)
def run_application_prediction(
    application_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """
    Triggers local ML prediction engine for a loan application.
    Returns prediction result or 503 SERVICE_UNAVAILABLE if dataset/model is pending.
    """
    app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Loan application '{application_id}' was not found."}
        )

    try:
        result = prediction_service.predict_application(db, application_id)
        return result
    except DatasetBlockerException as e:
        logger.warning("Prediction blocked for %s: %s", application_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATASET_BLOCKER",
                "message": str(e),
                "details": {
                    "application_id": application_id,
                    "status": "BLOCKED",
                    "reason": "Missing shared/preprocessing.json or bank_B_train.json"
                }
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(e)}
        )
