import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import engine, Base
from database.seed import seed_database
from ml.schema import FEATURE_NAMES, EXCLUDED_KYC_FIELDS, extract_feature_vector
from ml.preprocessing import BankBPreprocessor, DatasetBlockerException
from ml.model import BankBModel
from backend.auth import create_employee_access_token


client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)
    seed_database()


def get_auth_header():
    token = create_employee_access_token({"sub": "admin_b", "role": "OFFICER"})
    return {"Authorization": f"Bearer {token}"}



def test_17_feature_schema_exact_count_and_order():
    """Verify that FEATURE_NAMES has exactly 17 items in canonical order."""
    assert len(FEATURE_NAMES) == 17
    assert FEATURE_NAMES[0] == "age"
    assert FEATURE_NAMES[1] == "annual_income"
    assert FEATURE_NAMES[2] == "employment_length_years"
    assert FEATURE_NAMES[3] == "loan_amount"
    assert FEATURE_NAMES[4] == "loan_percent_income"
    assert FEATURE_NAMES[5] == "credit_history_length_years"
    assert FEATURE_NAMES[6] == "previous_default"
    assert FEATURE_NAMES[7] == "home_ownership_RENT"
    assert FEATURE_NAMES[8] == "home_ownership_OWN"
    assert FEATURE_NAMES[9] == "home_ownership_MORTGAGE"
    assert FEATURE_NAMES[10] == "home_ownership_OTHER"
    assert FEATURE_NAMES[11] == "loan_purpose_EDUCATION"
    assert FEATURE_NAMES[12] == "loan_purpose_MEDICAL"
    assert FEATURE_NAMES[13] == "loan_purpose_VENTURE"
    assert FEATURE_NAMES[14] == "loan_purpose_PERSONAL"
    assert FEATURE_NAMES[15] == "loan_purpose_DEBT_CONSOLIDATION"
    assert FEATURE_NAMES[16] == "loan_purpose_HOME_IMPROVEMENT"


def test_kyc_fields_exclusion_list():
    """Verify that non-model KYC fields are explicitly excluded."""
    assert "name" in EXCLUDED_KYC_FIELDS
    assert "phone" in EXCLUDED_KYC_FIELDS
    assert "address" in EXCLUDED_KYC_FIELDS
    assert "gender" in EXCLUDED_KYC_FIELDS
    assert "credit_score" in EXCLUDED_KYC_FIELDS
    assert "existing_debt" in EXCLUDED_KYC_FIELDS
    assert "duration_months" in EXCLUDED_KYC_FIELDS

    # Verify none of the KYC fields appear in FEATURE_NAMES
    for kyc_field in EXCLUDED_KYC_FIELDS:
        assert kyc_field not in FEATURE_NAMES


def test_feature_vector_extraction_shape_and_values():
    """Verify that extract_feature_vector produces a vector of shape (17,)."""
    raw_app = {
        "name": "Sunita Sharma",  # KYC field
        "phone": "+91-9823011223",  # KYC field
        "income": 600000,
        "loan_amount": 200000,
        "employment_length_years": 4,
        "home_ownership": "RENT",
        "loan_purpose": "PERSONAL",
        "previous_default": 0,
        "age": 32,
        "credit_history_length_years": 6
    }
    vector = extract_feature_vector(raw_app)
    assert isinstance(vector, np.ndarray)
    assert vector.shape == (17,)

    # Spot-check values
    assert vector[0] == 32.0  # age
    assert vector[1] == 600000.0  # annual_income
    assert vector[2] == 4.0  # employment_length_years
    assert vector[3] == 200000.0  # loan_amount
    assert vector[4] == pytest.approx(200000.0 / 600000.0)  # loan_percent_income
    assert vector[6] == 0.0  # previous_default
    assert vector[7] == 1.0  # home_ownership_RENT
    assert vector[14] == 1.0  # loan_purpose_PERSONAL


def test_model_parameter_shapes():
    """Verify that BankBModel training produces coef_ (1, 17) and intercept_ (1,)."""
    model = BankBModel()
    # Dummy dataset with 20 samples and 17 features
    np.random.seed(42)
    X_dummy = np.random.randn(20, 17)
    y_dummy = np.random.randint(0, 2, size=20)

    train_res = model.train(X_dummy, y_dummy)
    assert train_res["coef_shape"] == (1, 17)
    assert train_res["intercept_shape"] == (1,)
    assert model.is_trained is True

    # Test single prediction shape (1, 17)
    single_vec = X_dummy[0]
    prob = model.predict_probability(single_vec)
    assert 0.0 <= prob <= 1.0


def test_configurable_risk_mapping():
    """Verify that risk mapping is configurable and uses defined thresholds."""
    model = BankBModel(low_risk_threshold=0.25, high_risk_threshold=0.55)

    risk, rec = model.classify_risk(0.10)
    assert risk == "LOW"
    assert rec == "ELIGIBLE"

    risk, rec = model.classify_risk(0.40)
    assert risk == "MEDIUM"
    assert rec == "HOLD_FOR_VERIFICATION"

    risk, rec = model.classify_risk(0.70)
    assert risk == "HIGH"
    assert rec == "NOT_RECOMMENDED"


def test_missing_preprocessing_json_raises_blocker_exception():
    """Verify that preprocessor raises DatasetBlockerException when preprocessing.json is missing."""
    preprocessor = BankBPreprocessor(json_path="./non_existent_preprocessing.json")
    vec = np.zeros(17)

    with pytest.raises(DatasetBlockerException) as exc_info:
        preprocessor.transform(vec)

    assert "shared/preprocessing.json" in str(exc_info.value)
    assert "BLOCKED" in str(exc_info.value)


def test_prediction_api_returns_dataset_blocker_503():
    """Verify that prediction API returns 503 DATASET_BLOCKER when dataset is pending."""
    headers = get_auth_header()
    # Create fresh application
    payload = {
        "customer_id": "CUST-000001",
        "income": 700000.0,
        "employment_length_years": 3.0,
        "debt": 50000.0,
        "credit_score": 710,
        "loan_amount": 200000.0,
        "loan_purpose": "PERSONAL",
        "home_ownership": "OWN",
        "previous_default": 0
    }
    create_res = client.post("/api/applications", json=payload, headers=headers)
    assert create_res.status_code == 201
    app_id = create_res.json()["application_id"]

    res = client.post(f"/api/applications/{app_id}/predict", headers=headers)

    assert res.status_code == 503
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "DATASET_BLOCKER"
    assert "BLOCKED" in data["error"]["message"]


