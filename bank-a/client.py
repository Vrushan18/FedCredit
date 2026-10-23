"""
Flower Federated Learning Client for Bank A
Conforms strictly to FedCredit Team Contract Section 6 & 8:
- Connects to Flower Server on SERVER_IP:FLOWER_PORT
- Exchanges [coef_ (1x17), intercept_ (1,)]
- Evaluates on common test set and trains on local Bank A dataset
- Saves updated global parameters locally to models/global_vN.json
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any, Tuple
import numpy as np
import flwr as fl

# Ensure root folder in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.model import CreditRiskModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [BankA-FL] %(message)s")
logger = logging.getLogger("bank_a.client")

class BankAFlowerClient(fl.client.NumPyClient):
    def __init__(
        self,
        model: CreditRiskModel,
        train_path: str,
        test_path: str,
        models_dir: str = "./models",
        db_session_factory = None
    ):
        self.model = model
        self.train_path = train_path
        self.test_path = test_path
        self.models_dir = models_dir
        self.db_session_factory = db_session_factory
        self.current_round = 0
        os.makedirs(models_dir, exist_ok=True)

    def get_parameters(self, config: Dict[str, Any]) -> List[np.ndarray]:
        logger.info("Serving current local parameters to Flower server")
        return self.model.get_parameters()

    def fit(self, parameters: List[np.ndarray], config: Dict[str, Any]) -> Tuple[List[np.ndarray], int, Dict[str, Any]]:
        self.current_round += 1
        server_round = config.get("server_round", self.current_round)
        logger.info(f"--- FL Fit Round {server_round} Initiated ---")
        
        # 1. Update model with parameters received from central server
        self.model.set_parameters(parameters, version=f"v{server_round}-fed")
        
        # 2. Save latest global model snapshot
        round_snapshot_path = os.path.join(self.models_dir, f"global_v{server_round}.json")
        latest_path = os.path.join(self.models_dir, "global_model.json")
        self.model.save_weights(round_snapshot_path)
        self.model.save_weights(latest_path)
        
        # 3. Perform local training on Bank A's partition
        metrics = self.model.train_local(self.train_path)
        num_examples = metrics["samples"]
        loss = metrics["loss"]
        accuracy = metrics["accuracy"]
        auc = metrics["auc"]
        
        # 4. Record to database if session factory is available
        self._record_training_log(server_round, loss, accuracy, num_examples)
        
        logger.info(f"FL Fit Round {server_round} Complete: Loss={loss:.4f}, Accuracy={accuracy:.4f}, AUC={auc:.4f}")
        return self.model.get_parameters(), num_examples, {
            "loss": float(loss),
            "accuracy": float(accuracy),
            "auc": float(auc)
        }

    def evaluate(self, parameters: List[np.ndarray], config: Dict[str, Any]) -> Tuple[float, int, Dict[str, Any]]:
        logger.info("Evaluating parameters on common test set...")
        self.model.set_parameters(parameters)
        eval_metrics = self.model.evaluate_test(self.test_path)
        loss = eval_metrics["loss"]
        num_examples = eval_metrics["samples"]
        accuracy = eval_metrics["accuracy"]
        auc = eval_metrics["auc"]
        
        logger.info(f"Evaluation results: Loss={loss:.4f}, Accuracy={accuracy:.4f}, AUC={auc:.4f}")
        return float(loss), int(num_examples), {
            "accuracy": float(accuracy),
            "auc": float(auc),
            "loss": float(loss)
        }

    def _record_training_log(self, round_num: int, loss: float, accuracy: float, num_examples: int):
        if self.db_session_factory:
            try:
                from backend.models import LocalTrainingLog
                db = self.db_session_factory()
                log_entry = LocalTrainingLog(
                    round=round_num,
                    local_loss=loss,
                    local_accuracy=accuracy,
                    timestamp=None
                )
                db.add(log_entry)
                db.commit()
                db.close()
            except Exception as e:
                logger.warning(f"Could not persist FL training log to DB: {e}")

def run_client():
    from backend.config import settings
    from backend.database import SessionLocal
    
    train_path = settings.DATASET_PATH
    test_path = getattr(settings, "TEST_DATASET_PATH", "./data/common_test.json")
    
    if not os.path.exists(train_path):
        logger.warning(f"Train dataset {train_path} not found. Running partitioner...")
        from split_dataset import split_and_partition
        split_and_partition(bank="A", seed=42)
        
    model = CreditRiskModel()
    # Check if existing weights exist
    latest_weights = "./models/global_model.json"
    if os.path.exists(latest_weights):
        model.load_weights(latest_weights)
        logger.info(f"Loaded existing model weights from {latest_weights}")
    else:
        logger.info("No prior weights found. Training initial local baseline...")
        model.train_local(train_path)
        model.save_weights(latest_weights)

    client = BankAFlowerClient(
        model=model,
        train_path=train_path,
        test_path=test_path,
        models_dir="./models",
        db_session_factory=SessionLocal
    )
    
    server_address = f"{settings.SERVER_IP}:{settings.FLOWER_PORT}"
    logger.info(f"Connecting to Flower FL Server at {server_address}...")
    fl.client.start_client(
        server_address=server_address,
        client=client.to_client()
    )

if __name__ == "__main__":
    run_client()
