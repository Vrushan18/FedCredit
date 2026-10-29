"""
Bank B Flower Client Package.
Provides modular NumPyClient integration, parameter conversion utilities,
strict shape validation, and dataset blocker enforcement.
"""

from .utils import sklearn_to_parameters, parameters_to_sklearn
from .client import BankBFlowerClient, start_bank_b_flower_client

__all__ = [
    "sklearn_to_parameters",
    "parameters_to_sklearn",
    "BankBFlowerClient",
    "start_bank_b_flower_client",
]
