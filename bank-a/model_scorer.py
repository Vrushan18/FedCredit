# bank-a/model_scorer.py (identical for bank-b)
# Local Credit Risk Prediction & SHAP Explainability Engine

import os
import json
import logging
import numpy as np
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("bank_a.scorer")

# Home ownership categories (4 classes: indices 7 to 10)
HOMES = ["RENT", "OWN", "MORTGAGE", "OTHER"]

# Loan purpose categories (6 classes: indices 11 to 16)
PURPOSES = ["EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT"]

def assemble_17_feature_vector(
    age: float,
    annual_income: float,
    employment_length_years: float,
    loan_amount: float,
    credit_history_length_years: float,
    previous_default: int,
    home_ownership: str,
    loan_purpose: str
) -> np.ndarray:
    """
    Builds the standardized 17-feature vector according to the frozen consortium schema:
    [0]  age
    [1]  annual_income
    [2]  employment_length_years
    [3]  loan_amount
    [4]  loan_percent_income
    [5]  credit_history_length_years
    [6]  previous_default
    [7-10]  home_ownership (RENT, OWN, MORTGAGE, OTHER)
    [11-16] loan_purpose (EDUCATION, MEDICAL, VENTURE, PERSONAL, DEBT_CONSOLIDATION, HOME_IMPROVEMENT)
    """
    loan_percent_income = float(loan_amount) / (float(annual_income) + 1e-5)
    features = np.zeros(17, dtype=np.float32)
    features[0] = float(age)
    features[1] = float(annual_income)
    features[2] = float(employment_length_years)
    features[3] = float(loan_amount)
    features[4] = float(loan_percent_income)
    features[5] = float(credit_history_length_years)
    features[6] = float(previous_default)

    norm_home = str(home_ownership).strip().upper()
    if norm_home in HOMES:
        features[7 + HOMES.index(norm_home)] = 1.0

    norm_purpose = str(loan_purpose).strip().upper()
    if norm_purpose in PURPOSES:
        features[11 + PURPOSES.index(norm_purpose)] = 1.0

    return features

def load_local_model_weights() -> Tuple[np.ndarray, float]:
    """Loads weights from the local model file if Head Office is unavailable."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "models", "global_model.json"),
        os.path.join(base_dir, "..", "models", "global_model.json"),
        os.path.join(base_dir, "models", "local_baseline.json")
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                weights = np.array(data["coef"][0], dtype=np.float32)
                intercept = float(data["intercept"][0])
                return weights, intercept
            except Exception as e:
                logger.warning(f"Error reading model weights from {path}: {e}")
                
    # Fallback default baseline weights
    return np.zeros((17,), dtype=np.float32), 0.0

def score_credit_risk(
    age: float,
    annual_income: float,
    employment_length_years: float,
    loan_amount: float,
    credit_history_length_years: float,
    previous_default: int,
    home_ownership: str,
    loan_purpose: str,
    weights: Optional[np.ndarray] = None,
    intercept: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes default probability via logistic sigmoid and generates underwriting decision.
    """
    if weights is None or intercept is None:
        weights, intercept = load_local_model_weights()

    features = assemble_17_feature_vector(
        age, annual_income, employment_length_years,
        loan_amount, credit_history_length_years, previous_default,
        home_ownership, loan_purpose
    )

    z = float(np.dot(weights, features) + intercept)
    z_clipped = float(np.clip(z, -50.0, 50.0))
    prob_default = float(1.0 / (1.0 + np.exp(-z_clipped)))

    if prob_default < 0.30:
        decision = "APPROVED"
        msg = f"Pre-Approved: Low risk default probability ({prob_default * 100:.1f}%)"
    elif prob_default <= 0.60:
        decision = "VERIFICATION_REQUIRED"
        msg = f"Hold: Moderate risk ({prob_default * 100:.1f}%). Additional income verification required"
    else:
        decision = "REJECTED"
        msg = f"Declined: High credit risk ({prob_default * 100:.1f}% default probability)"

    return {
        "decision": decision,
        "message": msg,
        "prob_default": round(prob_default, 4),
        "features": features.tolist()
    }
