"""
Bank B ML Schema Module.
Enforces the frozen 17-feature schema contract and excludes non-model KYC fields.
"""
from typing import Dict, Any, Tuple
import numpy as np

# FROZEN 17-FEATURE SCHEMA (EXACT ORDER MATCHING PROJECT CONTRACT)
FEATURE_NAMES = [
    "age",
    "annual_income",
    "employment_length_years",
    "loan_amount",
    "loan_percent_income",
    "credit_history_length_years",
    "previous_default",
    "home_ownership_RENT",
    "home_ownership_OWN",
    "home_ownership_MORTGAGE",
    "home_ownership_OTHER",
    "loan_purpose_EDUCATION",
    "loan_purpose_MEDICAL",
    "loan_purpose_VENTURE",
    "loan_purpose_PERSONAL",
    "loan_purpose_DEBT_CONSOLIDATION",
    "loan_purpose_HOME_IMPROVEMENT",
]

# NON-MODEL KYC & MANUAL VERIFICATION FIELDS (STRICTLY EXCLUDED FROM MODEL)
EXCLUDED_KYC_FIELDS = [
    "name",
    "phone",
    "address",
    "gender",
    "credit_score",
    "existing_debt",
    "duration_months",
]


def extract_feature_vector(data: Dict[str, Any], age: float = 30.0, credit_history_length_years: float = 5.0) -> np.ndarray:
    """
    Extracts and constructs the exact 17-element numeric feature vector (shape: (17,))
    from raw application data.

    KYC fields (name, phone, address, gender, credit_score, existing_debt, duration_months)
    are strictly excluded.
    """
    # 1. Numeric features (6)
    income = float(data.get("income") or data.get("annual_income") or 0.0)
    loan_amount = float(data.get("loan_amount", 0.0))
    emp_length = float(data.get("employment_length_years", 0.0))
    app_age = float(data.get("age", age))
    cred_hist = float(data.get("credit_history_length_years", credit_history_length_years))

    loan_percent_income = loan_amount / income if income > 0 else 0.0

    # 2. Binary default history (1)
    prev_default = 1.0 if int(data.get("previous_default", 0)) == 1 else 0.0

    # 3. One-Hot Home Ownership (4)
    ho = str(data.get("home_ownership", "RENT")).upper()
    ho_rent = 1.0 if ho == "RENT" else 0.0
    ho_own = 1.0 if ho == "OWN" else 0.0
    ho_mortgage = 1.0 if ho == "MORTGAGE" else 0.0
    ho_other = 1.0 if ho not in {"RENT", "OWN", "MORTGAGE"} else 0.0

    # 4. One-Hot Loan Purpose (6)
    lp = str(data.get("loan_purpose", "PERSONAL")).upper()
    lp_edu = 1.0 if lp == "EDUCATION" else 0.0
    lp_med = 1.0 if lp == "MEDICAL" else 0.0
    lp_ven = 1.0 if lp == "VENTURE" else 0.0
    lp_per = 1.0 if lp == "PERSONAL" else 0.0
    lp_deb = 1.0 if lp == "DEBT_CONSOLIDATION" else 0.0
    lp_hom = 1.0 if lp == "HOME_IMPROVEMENT" else 0.0

    vector = np.array([
        app_age,
        income,
        emp_length,
        loan_amount,
        loan_percent_income,
        cred_hist,
        prev_default,
        ho_rent,
        ho_own,
        ho_mortgage,
        ho_other,
        lp_edu,
        lp_med,
        lp_ven,
        lp_per,
        lp_deb,
        lp_hom
    ], dtype=np.float64)

    assert vector.shape == (17,), f"Expected feature vector shape (17,), got {vector.shape}"
    return vector
