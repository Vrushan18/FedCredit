"""
Federated Learning Flower Server Integration (Section 6 & 10 of Contract).
Implements weighted FedAvg with 2-client minimum, dynamic aggregation,
and real-time global model parameter publishing.
"""
import logging
import threading
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
import flwr as fl
from flwr.common import Metrics, parameters_to_ndarrays, ndarrays_to_parameters

from config import get_settings
from database import fl_state, global_model
from services import update_global_model_after_round, set_training_state
from schemas import TrainingState

logger = logging.getLogger("fedcredit.flower")
_settings = get_settings()

_flower_thread: Optional[threading.Thread] = None
_thread_lock = threading.Lock()


def weighted_average_metrics(metrics: List[Tuple[int, Metrics]]) -> Metrics:
    """Computes weighted average accuracy across all evaluating banks."""
    accuracies = [num_examples * m.get("accuracy", 0.0) for num_examples, m in metrics]
    examples = [num_examples for num_examples, _ in metrics]
    total_examples = sum(examples)
    global_acc = sum(accuracies) / total_examples if total_examples > 0 else 0.0
    return {"accuracy": float(global_acc)}


class FedCreditStrategy(fl.server.strategy.FedAvg):
    """
    Subclasses FedAvg to automatically capture aggregated model weights (coef_, intercept_)
    after every round and persist them to the Head Office model store.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.latest_round_acc: Optional[float] = None

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, fl.common.FitRes]],
        failures: List[BaseException]
    ) -> Tuple[Optional[fl.common.Parameters], Dict[str, fl.common.Scalar]]:
        parameters_aggregated, metrics_aggregated = super().aggregate_fit(server_round, results, failures)
        
        if parameters_aggregated is not None:
            ndarrays = parameters_to_ndarrays(parameters_aggregated)
            if len(ndarrays) >= 2:
                coef = ndarrays[0].tolist()
                intercept = ndarrays[1].tolist()
                update_global_model_after_round(
                    round_num=server_round,
                    coef=coef,
                    intercept=intercept,
                    accuracy=self.latest_round_acc
                )
                logger.info(f"[FedAvg] Persisted global model parameters for round {server_round}")
        
        return parameters_aggregated, metrics_aggregated

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, fl.common.EvaluateRes]],
        failures: List[BaseException]
    ) -> Tuple[Optional[float], Dict[str, fl.common.Scalar]]:
        loss_aggregated, metrics_aggregated = super().aggregate_evaluate(server_round, results, failures)
        if metrics_aggregated and "accuracy" in metrics_aggregated:
            self.latest_round_acc = float(metrics_aggregated["accuracy"])
            fl_state["global_accuracy"] = round(self.latest_round_acc * 100, 2)
            logger.info(f"[FedAvg] Evaluated round {server_round} global accuracy: {fl_state['global_accuracy']}%")
        return loss_aggregated, metrics_aggregated


def _run_server_worker():
    port = _settings.flower_port
    address = f"0.0.0.0:{port}"
    num_rounds = _settings.num_rounds
    
    # Initialize with 17 features as specified in Section 6
    initial_weights = [
        np.zeros((1, 17), dtype=np.float32),
        np.zeros((1,), dtype=np.float32)
    ]
    initial_params = ndarrays_to_parameters(initial_weights)

    strategy = FedCreditStrategy(
        min_fit_clients=_settings.min_fit_clients,
        min_evaluate_clients=_settings.min_eval_clients,
        min_available_clients=_settings.min_avail_clients,
        evaluate_metrics_aggregation_fn=weighted_average_metrics,
        initial_parameters=initial_params,
    )

    logger.info(f"Starting Flower gRPC Server on {address} for {num_rounds} rounds...")
    set_training_state(TrainingState.RUNNING)
    fl_state["banks_connected"] = ["BANK_A", "BANK_B"]
    fl_state["total_rounds"] = num_rounds

    try:
        fl.server.start_server(
            server_address=address,
            config=fl.server.ServerConfig(num_rounds=num_rounds),
            strategy=strategy,
        )
        set_training_state(TrainingState.DONE)
        logger.info("[Flower] All federated training rounds completed.")
    except Exception as e:
        logger.error(f"[Flower Server Exception] {e}")
        set_training_state(TrainingState.IDLE)


def start_flower_training_daemon() -> bool:
    """Starts the Flower server in a background thread if not already running."""
    global _flower_thread
    with _thread_lock:
        if _flower_thread and _flower_thread.is_alive():
            return False  # Already active
        
        _flower_thread = threading.Thread(target=_run_server_worker, daemon=True)
        _flower_thread.start()
        return True
