"""
Centralised settings loaded once from .env.
Every other module imports from here — never re-read os.environ directly.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    api_port: int = 8000
    flower_port: int = 8080
    server_ip: str = "127.0.0.1"

    # JWT
    admin_jwt_secret: str = "change_me"
    customer_jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 hours

    # Flower FL
    num_rounds: int = 5
    min_fit_clients: int = 2
    min_eval_clients: int = 2
    min_avail_clients: int = 2

    # Bank API keys (raw; stored hashed in the registry)
    bank_a_api_key: str = "bank_a_dev_key_change_in_prod"
    bank_b_api_key: str = "bank_b_dev_key_change_in_prod"

    # CORS
    portal_origin: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
