"""
Bank B Flower Client Implementation.
Provides modular NumPyClient subclassing flwr.client.NumPyClient with dataset
blocker enforcement, privacy safeguards, parameter shape validation, and server connectivity.
"""
from typing import List, Tuple, Dict, Any, Optional
import os
import logging
import numpy as np
import flwr as fl

from backend.config import settings, logger
from ml.model import BankBModel
from ml.preprocessing import BankBPreprocessor, DatasetBlockerException

from flower_client.utils import sklearn_to_parameters, parameters_to_sklearn


class BankBFlowerClient(fl.client.NumPyClient):
    """
    Flower NumPyClient for Bank B (State Co-op Bank).
    Interacts with the central Head Office Flower Server (port 8080) for federated learning.
    Strictly preserves customer data privacy: ONLY model parameters and scalar metrics leave Bank B.
    """

    def __init__(
        self,
        model: Optional[BankBModel] = None,
        preprocessor: Optional[BankBPreprocessor] = None
    ):
        self.model = model or BankBModel()
        self.preprocessor = preprocessor or BankBPreprocessor()

    def get_parameters(self, config: Dict[str, Any] = None) -> List[np.ndarray]:
        """
        Return the current local model parameter arrays [coef_, intercept_].
        Enforces (1, 17) and (1,) shapes.
        """
        logger.info("Flower Client: Extracting parameters for Head Office exchange.")
        return sklearn_to_parameters(self.model)

    def fit(
        self,
        parameters: List[np.ndarray],
        config: Dict[str, Any] = None
    ) -> Tuple[List[np.ndarray], int, Dict[str, Any]]:
        """
        Local federated training step.
        If canonical training data is missing, raises DatasetBlockerException without fabricating metrics.
        """
        config = config or {}
        logger.info("Flower Client: Received global parameters from Flower server for fit().")

        # Verify dataset availability
        if not self.preprocessor.is_ready:
            logger.warning("Flower Client: Canonical dataset missing. Local training is BLOCKED.")
            raise DatasetBlockerException(
                "BLOCKED — Canonical Bank B training dataset/preprocessing unavailable."
            )

        # Load global parameters into local model with shape validation
        parameters_to_sklearn(parameters, self.model)

        # Load local dataset
        X_train, y_train = self.preprocessor.get_train_data()
        if X_train is None or y_train is None or len(X_train) == 0:
            raise DatasetBlockerException(
                "BLOCKED — Canonical Bank B training dataset/preprocessing unavailable."
            )

        # Execute local training
        epochs = config.get("epochs", 1)
        logger.info("Flower Client: Fitting local Bank B model on %d samples.", len(X_train))
        self.model.fit(X_train, y_train)

        # Extract updated local parameters
        updated_parameters = sklearn_to_parameters(self.model)
        num_samples = len(X_train)
        
        # Calculate local training metrics
        acc = float(self.model.score(X_train, y_train))
        metrics = {"accuracy": acc}

        logger.info("Flower Client: Completed local training. Sample count=%d, Accuracy=%.4f", num_samples, acc)
        return updated_parameters, num_samples, metrics

    def evaluate(
        self,
        parameters: List[np.ndarray],
        config: Dict[str, Any] = None
    ) -> Tuple[float, int, Dict[str, Any]]:
        """
        Local federated evaluation step.
        If canonical training/validation data is missing, raises DatasetBlockerException without fabricating metrics.
        """
        config = config or {}
        logger.info("Flower Client: Received global parameters from Flower server for evaluate().")

        if not self.preprocessor.is_ready:
            logger.warning("Flower Client: Canonical dataset missing. Evaluation is BLOCKED.")
            raise DatasetBlockerException(
                "BLOCKED — Canonical Bank B training dataset/preprocessing unavailable."
            )

        parameters_to_sklearn(parameters, self.model)
        X_val, y_val = self.preprocessor.get_val_data()

        if X_val is None or y_val is None or len(X_val) == 0:
            raise DatasetBlockerException(
                "BLOCKED — Canonical Bank B training dataset/preprocessing unavailable."
            )

        acc = float(self.model.score(X_val, y_val))
        loss = float(1.0 - acc)
        num_samples = len(X_val)
        metrics = {"accuracy": acc}

        logger.info("Flower Client: Evaluation complete. Loss=%.4f, Accuracy=%.4f", loss, acc)
        return loss, num_samples, metrics


def start_bank_b_flower_client(server_address: Optional[str] = None) -> None:
    """
    Connect Bank B Flower client to central Flower server.
    Uses supplied server_address if provided, otherwise constructs from settings.SERVER_IP and settings.FLOWER_PORT.
    Catches network/connection errors gracefully.
    """
    if not server_address:
        flower_port = getattr(settings, "FLOWER_PORT", 8080)
        server_address = f"{settings.SERVER_IP}:{flower_port}"

    logger.info("Starting Bank B Flower NumPyClient connecting to %s ...", server_address)
    client = BankBFlowerClient()

    try:
        fl.client.start_numpy_client(
            server_address=server_address,
            client=client
        )
        logger.info("Flower Client successfully disconnected.")
    except Exception as e:
        logger.error("Flower Client connection failed to %s: %s", server_address, str(e))
        raise ConnectionError(f"Failed to connect Bank B Flower Client to '{server_address}': {str(e)}")
