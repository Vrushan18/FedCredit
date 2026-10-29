"""
Flower Client Parameter Utilities for Bank B.
Provides conversion between scikit-learn Logistic Regression / BankBModel
and Flower parameter lists [coef_, intercept_] with strict shape validation.
"""
from typing import List, Optional, Any
import numpy as np


FEATURE_COUNT = 17
EXPECTED_COEF_SHAPE = (1, FEATURE_COUNT)
EXPECTED_INTERCEPT_SHAPE = (1,)


def sklearn_to_parameters(model: Any) -> List[np.ndarray]:
    """
    Extract coef_ and intercept_ from scikit-learn LogisticRegression or BankBModel instance
    and return as a list of NumPy arrays [coef_, intercept_].

    Enforces strict parameter shape contract:
    - coef_: (1, 17)
    - intercept_: (1,)
    """
    if not hasattr(model, "coef_") or not hasattr(model, "intercept_"):
        raise ValueError("Model does not have 'coef_' and 'intercept_' attributes.")

    coef_attr = getattr(model, "coef_", None)
    intercept_attr = getattr(model, "intercept_", None)

    if coef_attr is None:
        coef = np.zeros(EXPECTED_COEF_SHAPE, dtype=np.float64)
    else:
        coef = np.array(coef_attr, dtype=np.float64)

    if intercept_attr is None:
        intercept = np.zeros(EXPECTED_INTERCEPT_SHAPE, dtype=np.float64)
    else:
        intercept = np.array(intercept_attr, dtype=np.float64)


    # Ensure coef shape is (1, 17)
    if coef.ndim == 1:
        if coef.shape[0] == FEATURE_COUNT:
            coef = coef.reshape(1, FEATURE_COUNT)
        else:
            raise ValueError(f"Invalid coefficient shape: expected {EXPECTED_COEF_SHAPE}, got {coef.shape}")

    if coef.shape != EXPECTED_COEF_SHAPE:
        raise ValueError(f"Invalid coefficient shape: expected {EXPECTED_COEF_SHAPE}, got {coef.shape}")

    # Ensure intercept shape is (1,)
    if intercept.ndim > 1:
        intercept = intercept.flatten()

    if intercept.shape != EXPECTED_INTERCEPT_SHAPE:
        raise ValueError(f"Invalid intercept shape: expected {EXPECTED_INTERCEPT_SHAPE}, got {intercept.shape}")

    return [coef, intercept]


def parameters_to_sklearn(parameters: List[np.ndarray], model: Optional[Any] = None) -> Any:
    """
    Load Flower parameter list [coef_, intercept_] into scikit-learn LogisticRegression or BankBModel.

    Strictly validates parameter shapes:
    - parameters[0]: shape (1, 17)
    - parameters[1]: shape (1,)

    Rejects malformed parameter arrays with ValueError instead of silent reshaping.
    """
    if not isinstance(parameters, (list, tuple)) or len(parameters) != 2:
        raise ValueError(f"Expected parameters to be a list of 2 NumPy arrays [coef, intercept], got {len(parameters) if isinstance(parameters, (list, tuple)) else type(parameters)}")

    coef = np.array(parameters[0], dtype=np.float64)
    intercept = np.array(parameters[1], dtype=np.float64)

    # Validate coef shape strictly
    if coef.shape != EXPECTED_COEF_SHAPE:
        raise ValueError(f"Invalid parameter dimensions: expected coef shape {EXPECTED_COEF_SHAPE}, got {coef.shape}")

    # Normalize 1D vs 2D 1-element intercept if needed, but enforce exact 1 element
    if intercept.ndim > 1:
        if intercept.size != 1:
            raise ValueError(f"Invalid parameter dimensions: expected intercept shape {EXPECTED_INTERCEPT_SHAPE}, got {intercept.shape}")
        intercept = intercept.flatten()

    if intercept.shape != EXPECTED_INTERCEPT_SHAPE:
        raise ValueError(f"Invalid parameter dimensions: expected intercept shape {EXPECTED_INTERCEPT_SHAPE}, got {intercept.shape}")

    if model is not None:
        model.coef_ = coef
        model.intercept_ = intercept

    return model
