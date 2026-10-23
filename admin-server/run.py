"""
FedCredit Head Office — One-Click Launcher
Runs the complete FastAPI Head Office server with embedded Admin Dashboard and FL engine.

Usage:
    python run.py
"""
import sys
import os

# Ensure local directory is on pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from config import get_settings
from database import init_db
import services

def main():
    settings = get_settings()
    
    # Initialize DB & Seed defaults
    init_db()
    services.seed_defaults()
    
    banner = f"""
========================================================================
   FEDCREDIT HEAD OFFICE & FEDERATED LEARNING ENGINE (LAPTOP 1)
   Engineer: Vrushan Patil (Head Office & FL Engine Lead)
========================================================================
   [+] Web Console:       http://localhost:{settings.api_port}/
   [+] Admin Dashboard:   http://localhost:{settings.api_port}/admin
   [+] Swagger API Docs:  http://localhost:{settings.api_port}/docs
   [+] ReDoc Specs:       http://localhost:{settings.api_port}/redoc
   [+] Health Endpoint:   http://localhost:{settings.api_port}/api/v1/health
   [+] Flower FL Server:  0.0.0.0:{settings.flower_port} (gRPC)
   [+] Database:          fedcredit.db (SQLite persistent storage)
========================================================================
   Press Ctrl+C to gracefully stop the Head Office server.
========================================================================
"""
    print(banner)
    uvicorn.run("server:app", host="0.0.0.0", port=settings.api_port, reload=False)

if __name__ == "__main__":
    main()
