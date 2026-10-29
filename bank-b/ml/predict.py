"""
Bank B ML Prediction Service.
Integrates feature extraction, preprocessor verification, ML classification,
and prediction record persistence in the local Bank B database.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.models import LoanApplication, Customer, Prediction
from ml.schema import extract_feature_vector
from ml.preprocessing import BankBPreprocessor, DatasetBlockerException
from ml.model import BankBModel
from ml.explainability import BankBSHAPExplainer
from backend.config import logger


class PredictionService:
    """
    Coordinates local ML prediction workflow and SHAP explainability for Bank B loan applications.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.preprocessor = BankBPreprocessor()
        self.model = BankBModel()
        self.model_path = model_path or "./ml/saved_models/bank_b_model.joblib"
        self.shap_explainer = BankBSHAPExplainer()

        if self.model_path and self._model_file_exists():
            try:
                self.model.load_model(self.model_path)
                self.shap_explainer = BankBSHAPExplainer(model=self.model.model)
            except Exception as e:
                logger.warning("Could not load model from %s: %s", self.model_path, str(e))

    def _model_file_exists(self) -> bool:
        import os
        return os.path.exists(self.model_path)

    def predict_application(self, db: Session, application_id: str) -> Dict[str, Any]:
        """
        Runs ML prediction and SHAP explanation for a given loan application ID.
        If shared/preprocessing.json or trained model is unavailable,
        raises DatasetBlockerException.
        """
        app_record = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
        if not app_record:
            raise ValueError(f"Loan application '{application_id}' not found.")

        customer = db.query(Customer).filter(Customer.customer_id == app_record.customer_id).first()
        age = customer.age if customer else 30.0

        # Construct raw application dictionary
        app_data = {
            "income": app_record.income,
            "employment_length_years": app_record.employment_length_years,
            "debt": app_record.debt,
            "credit_score": app_record.credit_score,
            "loan_amount": app_record.loan_amount,
            "loan_purpose": app_record.loan_purpose,
            "home_ownership": app_record.home_ownership,
            "previous_default": app_record.previous_default,
            "age": age,
            "credit_history_length_years": 5.0
        }

        # Extract 17-feature vector (vector shape: (17,))
        vector = extract_feature_vector(app_data)

        # Check preprocessor status (Raises DatasetBlockerException if missing)
        if not self.preprocessor.is_loaded:
            raise DatasetBlockerException(
                "Canonical preprocessing file 'shared/preprocessing.json' is missing from repository. "
                "Model inference and training are BLOCKED pending Head Office dataset configuration."
            )

        # Check model status
        if not self.model.is_trained or self.model.model is None:
            raise DatasetBlockerException(
                "Bank B ML model is not trained yet. "
                "Training is BLOCKED pending canonical bank_B_train.json dataset delivery."
            )

        # Preprocess and execute prediction
        scaled_vector = self.preprocessor.transform(vector)
        prob = self.model.predict_probability(scaled_vector)
        risk_level, rec = self.model.classify_risk(prob)

        # Calculate genuine SHAP values
        shap_payload = self.shap_explainer.explain_instance(scaled_vector, model=self.model.model)

        # Record prediction in DB
        pred_record = Prediction(
            application_id=application_id,
            risk_level=risk_level,
            default_prob=prob,
            recommendation=rec,
            shap_values=shap_payload,
            created_at=datetime.utcnow()
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)

        logger.info(
            "Executed prediction & SHAP explanation for %s: Risk=%s, Prob=%.4f, Rec=%s",
            application_id, risk_level, prob, rec
        )

        return {
            "prediction_id": pred_record.id,
            "application_id": application_id,
            "risk_level": risk_level,
            "default_prob": prob,
            "recommendation": rec,
            "shap_values": shap_payload,
            "created_at": pred_record.created_at.isoformat()
        }

