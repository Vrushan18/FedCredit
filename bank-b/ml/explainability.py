"""
Bank B ML Explainability Module (SHAP).
Uses official `shap` library (shap.LinearExplainer) to compute local feature attributions
for the canonical 17-feature Logistic Regression credit risk model.
"""
from typing import Dict, Any, List, Optional
import numpy as np
import shap
from sklearn.linear_model import LogisticRegression

from ml.schema import FEATURE_NAMES, EXCLUDED_KYC_FIELDS
from ml.preprocessing import DatasetBlockerException
from backend.config import logger

# Friendly human-readable feature labels for UI rendering
FEATURE_LABELS = {
    "age": "Applicant Age",
    "annual_income": "Annual Income",
    "employment_length_years": "Work Experience (Years)",
    "loan_amount": "Requested Loan Amount",
    "loan_percent_income": "Loan-to-Income Ratio",
    "credit_history_length_years": "Credit History Length",
    "previous_default": "Previous Default History",
    "home_ownership_RENT": "Home Ownership: Rent",
    "home_ownership_OWN": "Home Ownership: Own",
    "home_ownership_MORTGAGE": "Home Ownership: Mortgage",
    "home_ownership_OTHER": "Home Ownership: Other",
    "loan_purpose_EDUCATION": "Loan Purpose: Education",
    "loan_purpose_MEDICAL": "Loan Purpose: Medical",
    "loan_purpose_VENTURE": "Loan Purpose: Venture",
    "loan_purpose_PERSONAL": "Loan Purpose: Personal",
    "loan_purpose_DEBT_CONSOLIDATION": "Loan Purpose: Debt Consolidation",
    "loan_purpose_HOME_IMPROVEMENT": "Loan Purpose: Home Improvement",
}


class BankBSHAPExplainer:
    """
    Computes genuine SHAP values for Bank B model predictions using official `shap.LinearExplainer`.
    """

    def __init__(self, model: Optional[LogisticRegression] = None, background_data: Optional[np.ndarray] = None):
        self.model = model
        self.background_data = background_data
        self.explainer: Optional[shap.LinearExplainer] = None

        if self.model is not None and hasattr(self.model, "coef_"):
            self._initialize_explainer()

    def _initialize_explainer(self) -> None:
        """Initializes shap.LinearExplainer on trained LogisticRegression model."""
        if self.background_data is None:
            # Default zero-mean 17-feature background matrix shape (1, 17)
            self.background_data = np.zeros((1, 17), dtype=np.float64)

        try:
            self.explainer = shap.LinearExplainer(self.model, self.background_data)
            logger.info("Initialized official SHAP LinearExplainer for Bank B model.")
        except Exception as e:
            logger.error("Failed to initialize shap.LinearExplainer: %s", str(e))
            self.explainer = None

    def explain_instance(self, feature_vector: np.ndarray, model: Optional[LogisticRegression] = None) -> Dict[str, Any]:
        """
        Calculates genuine SHAP values for a single 17-feature vector instance.
        Returns:
            Dict containing:
                - shap_values: Dict[feature_name, shap_float_value] (length = 17)
                - top_risk_factors: List of positive SHAP impact features
                - top_mitigating_factors: List of negative SHAP impact features
        Raises:
            DatasetBlockerException: If model is not trained or explainer cannot be initialized.
        """
        active_model = model or self.model
        if active_model is None or not hasattr(active_model, "coef_"):
            raise DatasetBlockerException(
                "SHAP explanation generation is BLOCKED because Bank B model is not trained. "
                "Pending canonical shared/preprocessing.json & bank_B_train.json delivery."
            )

        X = feature_vector.reshape(1, -1)
        assert X.shape == (1, 17), f"Expected SHAP input shape (1, 17), got {X.shape}"

        # Initialize explainer if not already set up
        if self.explainer is None:
            self.model = active_model
            self._initialize_explainer()

        if self.explainer is None:
            raise DatasetBlockerException("Could not initialize official SHAP explainer.")

        # Compute SHAP values using official shap library
        shap_res = self.explainer.shap_values(X)

        # Handle output format (array of shape (1, 17) or list of arrays for binary classification)
        if isinstance(shap_res, list):
            # Class 1 is default probability risk
            vals = shap_res[1][0] if len(shap_res) > 1 else shap_res[0][0]
        elif isinstance(shap_res, np.ndarray):
            vals = shap_res[0] if shap_res.ndim == 2 else shap_res
        else:
            vals = np.array(shap_res).flatten()

        vals = np.asarray(vals, dtype=np.float64).flatten()
        assert len(vals) == 17, f"SHAP attribution length must be 17, got {len(vals)}"

        # Align SHAP values with 17 feature names
        shap_dict = {FEATURE_NAMES[i]: float(vals[i]) for i in range(17)}

        # Separate into positive risk factors and negative mitigating factors
        top_risk_factors = []
        top_mitigating_factors = []

        for name, val in shap_dict.items():
            item = {
                "feature": name,
                "label": FEATURE_LABELS.get(name, name),
                "shap_value": round(val, 6)
            }
            if val > 0:
                top_risk_factors.append(item)
            elif val < 0:
                top_mitigating_factors.append(item)

        # Sort positive risk factors descending (highest risk impact first)
        top_risk_factors.sort(key=lambda x: x["shap_value"], reverse=True)

        # Sort negative mitigating factors ascending (most negative / mitigating first)
        top_mitigating_factors.sort(key=lambda x: x["shap_value"])

        # Verify no KYC fields are included
        for kyc_field in EXCLUDED_KYC_FIELDS:
            assert kyc_field not in shap_dict, f"KYC field '{kyc_field}' unexpectedly present in SHAP explanation!"

        return {
            "explainer_type": "shap.LinearExplainer",
            "feature_count": 17,
            "shap_values": shap_dict,
            "top_risk_factors": top_risk_factors[:5],
            "top_mitigating_factors": top_mitigating_factors[:5]
        }
