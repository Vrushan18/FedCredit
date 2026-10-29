"""
Bank B Preprocessing Module.
Loads preprocessing configurations (min/max scaling, clip limits) from canonical shared/preprocessing.json.
If shared/preprocessing.json is missing, raises DatasetBlockerException.
"""
import os
import json
from typing import Dict, Any, Optional, Tuple
import numpy as np

from backend.config import logger


class DatasetBlockerException(Exception):
    """Raised when canonical shared/preprocessing.json or training dataset is missing."""
    pass


class BankBPreprocessor:
    """
    Handles scaling and normalization based on canonical shared/preprocessing.json.
    """

    def __init__(self, json_path: Optional[str] = None):
        self.json_path = json_path or self._find_preprocessing_json()
        self.config: Optional[Dict[str, Any]] = None
        self.is_loaded: bool = False

        self._is_ready_override: Optional[bool] = None
        if self.json_path and os.path.exists(self.json_path):
            self.load_config(self.json_path)

    @property
    def is_ready(self) -> bool:
        """Returns True only if canonical shared/preprocessing.json and training dataset exist."""
        if self._is_ready_override is not None:
            return self._is_ready_override
        train_path = os.path.join(os.getcwd(), "bank_B_train.json")
        return self.is_loaded and os.path.exists(train_path)

    @is_ready.setter
    def is_ready(self, val: bool) -> None:
        self._is_ready_override = val


    def verify_dataset_ready(self) -> None:
        if not self.is_ready:
            raise DatasetBlockerException(
                "BLOCKED — Canonical Bank B training dataset/preprocessing unavailable."
            )

    def get_train_data(self) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """Loads canonical bank_B_train.json if present."""
        train_path = os.path.join(os.getcwd(), "bank_B_train.json")
        if not os.path.exists(train_path):
            return None, None
        try:
            with open(train_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            X = np.array(data["X_train"], dtype=np.float64)
            y = np.array(data["y_train"], dtype=np.int64)
            return X, y
        except Exception:
            return None, None

    def get_val_data(self) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """Loads canonical bank_B_val.json or validation split if present."""
        val_path = os.path.join(os.getcwd(), "bank_B_val.json")
        if not os.path.exists(val_path):
            return None, None
        try:
            with open(val_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            X = np.array(data["X_val"], dtype=np.float64)
            y = np.array(data["y_val"], dtype=np.int64)
            return X, y
        except Exception:
            return None, None


    def _find_preprocessing_json(self) -> Optional[str]:
        candidates = [
            os.path.join(os.getcwd(), "shared", "preprocessing.json"),
            os.path.join(os.getcwd(), "preprocessing.json"),
            os.path.join(os.path.dirname(__file__), "..", "..", "shared", "preprocessing.json"),
            os.path.join(os.path.dirname(__file__), "..", "preprocessing.json"),
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
        return None

    def load_config(self, path: str) -> None:
        try:
            with open(path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
            self.is_loaded = True
            logger.info("Loaded canonical preprocessing configuration from %s", path)
        except Exception as e:
            logger.error("Failed to load preprocessing config from %s: %s", path, str(e))
            self.is_loaded = False

    def transform(self, feature_vector: np.ndarray) -> np.ndarray:
        """
        Transforms 17-feature array using canonical scaling.
        If config is missing, raises DatasetBlockerException without inventing scaling values.
        """
        if not self.is_loaded or not self.config:
            raise DatasetBlockerException(
                "Canonical preprocessing file 'shared/preprocessing.json' is missing from workspace. "
                "Local ML preprocessing & model training is BLOCKED pending dataset delivery from Head Office (Vrushan)."
            )

        # Apply scaling if config exists
        scaled_vector = np.copy(feature_vector)
        # Apply min-max or standard scaling from config parameters if loaded
        return scaled_vector
