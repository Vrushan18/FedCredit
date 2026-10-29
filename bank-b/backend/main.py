import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

# Ensure bank-b root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import settings, logger
from backend.database import engine, Base
from backend.dependencies import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from backend.routes import auth, health, customers, applications, dashboard, predictions, fraud
from database.seed import seed_database

import asyncio
import requests

def get_local_tailscale_ip() -> str:
    try:
        import subprocess
        cmd = ["C:\\Program Files\\Tailscale\\tailscale.exe", "ip", "-4"] if os.name == "nt" else ["tailscale", "ip", "-4"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    return getattr(settings, "BANK_B_IP", "100.123.40.4")

async def send_heartbeat_loop():
    url = f"http://{settings.SERVER_IP}:{settings.API_PORT}/api/v1/banks/heartbeat"
    headers = {"X-API-Key": settings.HEAD_OFFICE_API_KEY, "Content-Type": "application/json"}
    bank_ip = get_local_tailscale_ip()
    payload = {"api_base_url": f"http://{bank_ip}:{settings.BANK_API_PORT}"}
    while True:
        try:
            requests.post(url, json=payload, headers=headers, timeout=3)
            logger.info("Bank B heartbeat sent to Head Office at %s (Registered URL: %s)", url, payload["api_base_url"])
        except Exception:
            pass
        await asyncio.sleep(25)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Bank B Backend Service (Port %s)...", settings.BANK_API_PORT)
    heartbeat_task = None
    try:
        # Create database tables and seed defaults
        Base.metadata.create_all(bind=engine)
        seed_database()
        heartbeat_task = asyncio.create_task(send_heartbeat_loop())
    except Exception as e:
        logger.error("Database initialization during startup encountered an issue: %s", str(e))
    yield
    if heartbeat_task:
        heartbeat_task.cancel()
    logger.info("Shutting down Bank B Backend Service...")

app = FastAPI(
    title="FedCredit — Bank B API Service",
    description="State Co-op Bank Local Node (Port 8002)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware Setup
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    settings.PORTAL_ORIGIN,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow cross-origin requests for local bank testing & portal integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers for Frozen Error Envelope
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API Routers
app.include_router(auth.router)
app.include_router(health.router)
app.include_router(customers.router)
app.include_router(applications.router, prefix="/api/applications")
app.include_router(applications.router, prefix="/api/v1/applications")
app.include_router(applications.router, prefix="/applications")
app.include_router(applications.router, prefix="/v1/applications")
app.include_router(dashboard.router)
app.include_router(predictions.router)
app.include_router(fraud.router)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.BANK_API_PORT, reload=True)
