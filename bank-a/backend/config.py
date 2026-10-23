import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    BANK_ID: str = "BANK_A"
    BANK_NAME: str = "HDFC Retail Bank"
    BANK_API_PORT: int = 8001
    BANK_A_IP: str = "100.120.140.95"
    SERVER_IP: str = "100.127.141.31"
    API_PORT: int = 8000
    FLOWER_PORT: int = 8080
    HEAD_OFFICE_API_KEY: str = "bank_a_dev_key_change_in_prod"
    CUSTOMER_JWT_SECRET: str = "fedcredit_customer_dev_secret_2026"
    EMPLOYEE_JWT_SECRET: str = "bank_a_local_secret_2026"
    FRAUD_SECRET: str = "shared_demo_fraud_secret_between_banks"
    KYC_SALT: str = "consortium_kyc_salt_2026"
    HEAD_OFFICE_URL: str = "http://100.127.141.31:8000/api/v1"
    PORTAL_ORIGIN: str = "http://localhost:5173"
    DATABASE_URL: str = "sqlite:///./bank_a.db"
    DATASET_PATH: str = "./data/bank_a_train.json"
    TEST_DATASET_PATH: str = "./data/common_test.json"
    PREPROCESSING_PATH: str = "./preprocessing.json"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", os.path.join(os.path.dirname(__file__), "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
