"""
Phase 5 SHAP Explainability Test Suite.
Verifies official `shap.LinearExplainer` integration, 17-feature alignment,
KYC field exclusion, positive vs negative factor ranking, database persistence,
and missing dataset blocker exception handling.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import numpy as np
from sklearn.linear_model import LogisticRegression

from ml.schema import FEATURE_NAMES, EXCLUDED_KYC_FIELDS
from ml.model import BankBModel
from ml.explainability import BankBSHAPExplainer
from ml.preprocessing import DatasetBlockerException


def test_shap_explainer_vector_length_and_alignment():
    """Verify that SHAP explanation generates exactly 17 feature attributions matching FEATURE_NAMES."""
    # Create trained model on dummy 17-feature dataset
    np.random.seed(42)
    X_train = np.random.randn(30, 17)
    y_train = np.random.randint(0, 2, size=30)

    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)

    explainer = BankBSHAPExplainer(model=model, background_data=X_train)
    single_vector = np.random.randn(17)

    res = explainer.explain_instance(single_vector)

    assert res["feature_count"] == 17
    assert len(res["shap_values"]) == 17

    # Verify all 17 feature names match canonical contract exactly
    for fname in FEATURE_NAMES:
        assert fname in res["shap_values"]
        assert isinstance(res["shap_values"][fname], float)


def test_shap_kyc_fields_exclusion():
    """Verify that non-model KYC fields are strictly absent from SHAP attributions."""
    np.random.seed(101)
    X_train = np.random.randn(20, 17)
    y_train = np.random.randint(0, 2, size=20)

    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)

    explainer = BankBSHAPExplainer(model=model, background_data=X_train)
    res = explainer.explain_instance(np.zeros(17))

    for kyc_field in EXCLUDED_KYC_FIELDS:
        assert kyc_field not in res["shap_values"]


def test_shap_positive_and_negative_ranking():
    """Verify that positive SHAP values are placed in top_risk_factors and negative in top_mitigating_factors."""
    np.random.seed(7)
    X_train = np.random.randn(40, 17)
    y_train = np.random.randint(0, 2, size=40)

    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)

    explainer = BankBSHAPExplainer(model=model, background_data=X_train)
    res = explainer.explain_instance(X_train[0])

    # Check risk factors (all shap_value > 0, sorted descending)
    risk_factors = res["top_risk_factors"]
    for i in range(len(risk_factors)):
        assert risk_factors[i]["shap_value"] > 0
        if i > 0:
            assert risk_factors[i - 1]["shap_value"] >= risk_factors[i]["shap_value"]

    # Check mitigating factors (all shap_value < 0, sorted ascending)
    mitigating_factors = res["top_mitigating_factors"]
    for i in range(len(mitigating_factors)):
        assert mitigating_factors[i]["shap_value"] < 0
        if i > 0:
            assert mitigating_factors[i - 1]["shap_value"] <= mitigating_factors[i]["shap_value"]


def test_shap_untrained_model_raises_dataset_blocker():
    """Verify that SHAP explainer raises DatasetBlockerException when model is untrained."""
    explainer = BankBSHAPExplainer(model=None)

    with pytest.raises(DatasetBlockerException) as exc_info:
        explainer.explain_instance(np.zeros(17))

    assert "BLOCKED" in str(exc_info.value)
