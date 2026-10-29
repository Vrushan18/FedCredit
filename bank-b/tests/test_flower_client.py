"""
Phase 7 Flower Client & Parameter Exchange Test Suite.
Verifies bidirectional parameter conversions ((1,17) coef_, (1,) intercept_),
strict shape validation and rejection of malformed parameter arrays,
dataset blocker exception handling, privacy safeguard outbound payload inspection,
and connection error handling.
"""
import sys
import os
import pytest
import numpy as np
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.model import BankBModel
from ml.preprocessing import BankBPreprocessor, DatasetBlockerException

from flower_client.utils import sklearn_to_parameters, parameters_to_sklearn
from flower_client.client import BankBFlowerClient, start_bank_b_flower_client


def test_sklearn_to_parameters_conversion():
    """Verify conversion of scikit-learn model to Flower parameter list [(1,17), (1,)]."""
    model = BankBModel()
    # Mock fitted model parameters
    model.coef_ = np.ones((1, 17), dtype=np.float64) * 0.5
    model.intercept_ = np.array([0.25], dtype=np.float64)

    params = sklearn_to_parameters(model)

    assert isinstance(params, list)
    assert len(params) == 2
    assert params[0].shape == (1, 17)
    assert params[1].shape == (1,)
    assert np.allclose(params[0], 0.5)
    assert np.allclose(params[1], 0.25)


def test_parameters_to_sklearn_conversion():
    """Verify loading valid Flower parameters into model."""
    model = BankBModel()
    dummy_coef = np.full((1, 17), 0.75, dtype=np.float64)
    dummy_intercept = np.array([-0.1], dtype=np.float64)

    parameters_to_sklearn([dummy_coef, dummy_intercept], model)

    assert hasattr(model, "coef_")
    assert hasattr(model, "intercept_")
    assert model.coef_.shape == (1, 17)
    assert model.intercept_.shape == (1,)
    assert np.allclose(model.coef_, 0.75)
    assert np.allclose(model.intercept_, -0.1)


def test_invalid_parameter_shapes_rejected():
    """Verify malformed parameter arrays raise ValueError without silent reshaping."""
    model = BankBModel()

    # Case 1: Incorrect coefficient dimension (2, 17)
    bad_coef_2d = np.zeros((2, 17), dtype=np.float64)
    good_intercept = np.zeros((1,), dtype=np.float64)
    with pytest.raises(ValueError, match="Invalid parameter dimensions"):
        parameters_to_sklearn([bad_coef_2d, good_intercept], model)

    # Case 2: Incorrect feature count (1, 10) instead of (1, 17)
    bad_coef_10 = np.zeros((1, 10), dtype=np.float64)
    with pytest.raises(ValueError, match="Invalid parameter dimensions"):
        parameters_to_sklearn([bad_coef_10, good_intercept], model)

    # Case 3: Incorrect intercept dimension (5,)
    good_coef = np.zeros((1, 17), dtype=np.float64)
    bad_intercept = np.zeros((5,), dtype=np.float64)
    with pytest.raises(ValueError, match="Invalid parameter dimensions"):
        parameters_to_sklearn([good_coef, bad_intercept], model)

    # Case 4: Non-list payload
    with pytest.raises(ValueError):
        parameters_to_sklearn("invalid_payload", model)


def test_flower_client_get_parameters():
    """Verify BankBFlowerClient.get_parameters returns 2 NumPy parameter arrays."""
    client = BankBFlowerClient()
    params = client.get_parameters()

    assert isinstance(params, list)
    assert len(params) == 2
    assert params[0].shape == (1, 17)
    assert params[1].shape == (1,)


def test_fit_and_evaluate_missing_dataset_raises_blocker():
    """Verify fit() and evaluate() raise DatasetBlockerException when canonical dataset is missing."""
    preprocessor = BankBPreprocessor()
    # Force dataset ready flag to False
    preprocessor.is_ready = False

    client = BankBFlowerClient(preprocessor=preprocessor)
    dummy_params = [np.zeros((1, 17)), np.zeros((1,))]

    with pytest.raises(DatasetBlockerException, match="BLOCKED"):
        client.fit(dummy_params)

    with pytest.raises(DatasetBlockerException, match="BLOCKED"):
        client.evaluate(dummy_params)


def test_privacy_safeguard_outbound_payload_inspection():
    """
    CRITICAL PRIVACY TEST:
    Inspect outbound payload returned by fit() and evaluate() to guarantee ONLY model parameters
    and scalar metrics leave Bank B.
    Verify ZERO customer PII, raw features, biometrics, SHAP, or fraud records exist in outbound data.
    """
    mock_preprocessor = MagicMock(spec=BankBPreprocessor)
    mock_preprocessor.is_ready = True
    
    # Synthetic 17-feature dataset for test execution
    X_dummy = np.random.randn(20, 17)
    y_dummy = np.random.randint(0, 2, size=20)
    mock_preprocessor.get_train_data.return_value = (X_dummy, y_dummy)
    mock_preprocessor.get_val_data.return_value = (X_dummy, y_dummy)

    client = BankBFlowerClient(preprocessor=mock_preprocessor)
    dummy_params = [np.zeros((1, 17)), np.zeros((1,))]

    # 1. Audit fit() outbound payload
    updated_params, num_samples, metrics = client.fit(dummy_params)

    assert isinstance(updated_params, list)
    assert len(updated_params) == 2
    assert updated_params[0].shape == (1, 17)
    assert updated_params[1].shape == (1,)

    assert isinstance(num_samples, int)
    assert isinstance(metrics, dict)

    # List of prohibited PII / sensitive data key substrings
    prohibited_keys = [
        "name", "customer", "phone", "address", "gender", "income", "debt",
        "credit_score", "aadhaar", "pan", "fingerprint", "biometric",
        "shap", "fraud", "feature", "row", "dataset"
    ]

    for key in metrics.keys():
        key_lower = str(key).lower()
        for pkey in prohibited_keys:
            assert pkey not in key_lower, f"PRIVACY VIOLATION: Prohibited key '{key}' found in outbound Flower metrics payload!"

        # Ensure value is numeric scalar only
        val = metrics[key]
        assert isinstance(val, (int, float, np.integer, np.floating)), f"PRIVACY VIOLATION: Metric '{key}' value is not a numeric scalar!"

    # 2. Audit evaluate() outbound payload
    loss, num_eval_samples, eval_metrics = client.evaluate(dummy_params)

    assert isinstance(loss, (float, np.floating))
    assert isinstance(num_eval_samples, int)
    assert isinstance(eval_metrics, dict)

    for key in eval_metrics.keys():
        key_lower = str(key).lower()
        for pkey in prohibited_keys:
            assert pkey not in key_lower, f"PRIVACY VIOLATION: Prohibited key '{key}' found in outbound Flower evaluation metrics payload!"

        val = eval_metrics[key]
        assert isinstance(val, (int, float, np.integer, np.floating))


def test_flower_server_connection_unavailability_handled():
    """Verify connection failure to unreachable Flower server port raises clean ConnectionError."""
    with pytest.raises(ConnectionError, match="Failed to connect Bank B Flower Client"):
        start_bank_b_flower_client(server_address="127.0.0.1:59999")
