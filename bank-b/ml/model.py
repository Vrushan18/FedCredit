"""
Bank B ML Model Module.
Implements Logistic Regression model wrapper, weight shape verification ((1, 17) & (1,)),
model persistence, and configurable risk mapping logic.
"""
import os
from typing import Dict, Any, Tuple, Optional
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression

from backend.config import logger


class BankBModel:
    """
    Bank B Logistic Regression model wrapper enforcing 17-feature input shape.
    """

    def __init__(
        self,
        low_risk_threshold: float = float(os.getenv("ML_LOW_RISK_THRESHOLD", 0.30)),
        high_risk_threshold: float = float(os.getenv("ML_HIGH_RISK_THRESHOLD", 0.60))
    ):
        self.model: Optional[LogisticRegression] = None
        self.is_trained: bool = False
        self.low_risk_threshold = low_risk_threshold
        self.high_risk_threshold = high_risk_threshold
        self._coef_: Optional[np.ndarray] = None
        self._intercept_: Optional[np.ndarray] = None

    @property
    def coef_(self) -> np.ndarray:
        if self.model is not None and hasattr(self.model, "coef_"):
            return self.model.coef_
        if self._coef_ is not None:
            return self._coef_
        return np.zeros((1, 17), dtype=np.float64)

    @coef_.setter
    def coef_(self, val: np.ndarray) -> None:
        self._coef_ = val
        if self.model is None:
            self.initialize_untrained_model()
        self.model.coef_ = val
        self.is_trained = True

    @property
    def intercept_(self) -> np.ndarray:
        if self.model is not None and hasattr(self.model, "intercept_"):
            return self.model.intercept_
        if self._intercept_ is not None:
            return self._intercept_
        return np.zeros((1,), dtype=np.float64)

    @intercept_.setter
    def intercept_(self, val: np.ndarray) -> None:
        self._intercept_ = val
        if self.model is None:
            self.initialize_untrained_model()
        self.model.intercept_ = val
        self.is_trained = True

    def initialize_untrained_model(self) -> None:
        """Initializes empty scikit-learn LogisticRegression classifier."""
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        # Pre-initialize dummy classes_ for scikit-learn predict_proba capability if weights loaded manually
        self.model.classes_ = np.array([0, 1])


    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """
        Trains model on local Bank B dataset.
        Validates input shape (N, 17) and parameter shapes.
        """
        assert X.ndim == 2 and X.shape[1] == 17, f"Training X must be shape (N, 17), got {X.shape}"
        
        self.initialize_untrained_model()
        self.model.fit(X, y)
        self.is_trained = True

        # Verify parameter shapes
        coef_shape = self.model.coef_.shape
        intercept_shape = self.model.intercept_.shape
        assert coef_shape == (1, 17), f"Expected coef_ shape (1, 17), got {coef_shape}"
        assert intercept_shape == (1,), f"Expected intercept_ shape (1,), got {intercept_shape}"

        logger.info("Bank B Logistic Regression model trained successfully. coef_ shape: %s", coef_shape)
        return {
            "coef_shape": coef_shape,
            "intercept_shape": intercept_shape,
            "n_samples": len(y)
        }

    def fit(self, X: np.ndarray, y: np.ndarray) -> "BankBModel":
        """Scikit-learn compliant fit method."""
        self.train(X, y)
        return self

    def score(self, X: np.ndarray, y: np.ndarray) -> float:
        """Scikit-learn compliant score (accuracy) method."""
        if not self.is_trained or self.model is None:
            return 0.0
        return float(self.model.score(X, y))


    def predict_probability(self, feature_vector: np.ndarray) -> float:
        """
        Predicts default probability for a single 17-feature vector.
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model is not trained or loaded.")

        X = feature_vector.reshape(1, -1)
        assert X.shape == (1, 17), f"Expected input shape (1, 17), got {X.shape}"

        # Class 1 is default probability
        probs = self.model.predict_proba(X)
        return float(probs[0, 1])

    def classify_risk(self, default_prob: float) -> Tuple[str, str]:
        """
        Classifies default probability into risk_level and recommendation
        using configurable thresholds (default: 0.30 and 0.60).
        """
        if default_prob < self.low_risk_threshold:
            return "LOW", "ELIGIBLE"
        elif default_prob < self.high_risk_threshold:
            return "MEDIUM", "HOLD_FOR_VERIFICATION"
        else:
            return "HIGH", "NOT_RECOMMENDED"

    def save_model(self, path: str) -> str:
        """Persists trained model file."""
        if not self.is_trained or self.model is None:
            raise ValueError("Cannot save untrained model.")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.model, path)
        logger.info("Saved Bank B model to %s", path)
        return path

    def load_model(self, path: str) -> None:
        """Loads model file and verifies weight shapes."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found at '{path}'")
        self.model = joblib.load(path)
        self.is_trained = True

        coef_shape = self.model.coef_.shape
        intercept_shape = self.model.intercept_.shape
        assert coef_shape == (1, 17), f"Expected coef_ shape (1, 17), got {coef_shape}"
        assert intercept_shape == (1,), f"Expected intercept_ shape (1,), got {intercept_shape}"
        logger.info("Loaded Bank B model from %s. coef_ shape: %s", path, coef_shape)
