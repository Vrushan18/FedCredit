import os
import logging
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    BANK_ID: str = "BANK_B"
    BANK_API_PORT: int = 8002

    SERVER_IP: str = "100.127.141.31"

    API_PORT: int = 8000
    FLOWER_PORT: int = 8080
    HEAD_OFFICE_MODE: str = "mock"

    HEAD_OFFICE_API_KEY: str = "bank_b_dev_key_change_in_prod"
    CUSTOMER_JWT_SECRET: str = "fedcredit_customer_dev_secret_2026"
    EMPLOYEE_JWT_SECRET: str = "bank_b_local_secret_2026"
    FRAUD_SECRET: str = "shared_demo_fraud_secret_between_banks"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/bank_b_db"
    DEV_FALLBACK_DATABASE_URL: str = "sqlite:///./bank_b_dev.db"

    PORTAL_ORIGIN: str = "http://localhost:5173"
    DATASET_PATH: str = "./data/bank_B_train.json"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bank_b")
