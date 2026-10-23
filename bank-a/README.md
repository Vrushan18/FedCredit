# FedCredit — Bank A Local Node (HDFC Retail Banking Division)

**Developer**: Gopal (Laptop 2)  
**Role**: Bank Employee Portal + Flower Client + Local AI & Explainability Engine  
**Contract Conformance**: FEDCREDIT_TEAM_CONTRACT.md v1.0 (Day 1 Team Specification)  
**Standard Port**: `8001` (HTTP REST `/api`)  

---

## 1. Architecture Overview
Bank A is an autonomous participant in the **Privacy-Preserving Federated Credit Risk Prediction and Intelligent Fraud Alert System**.

Unlike centralized systems, **no customer financial data, KYC records, or biometric images ever leave this branch**.
- **Local Data Ownership**: All customer records and loan applications reside in Bank A's local database (`bank_a.db`).
- **Local AI Inference**: 17-feature Logistic Regression model running locally on Bank A's laptop.
- **Explainable AI (SHAP)**: Top 5 contributing factors with plain English labels and positive/negative impact directions.
- **Biometric Privacy**: Fingerprints are converted to a 64-character lowercase hex `protected_id` using `HMAC-SHA256(key=FRAUD_SECRET, message=fingerprint_image_bytes)`. The raw image is discarded immediately after hashing.
- **Dual-Layer Fraud Scoring**: Merges Head Office registry score and local branch rules (capped at 100).
- **Flower Federated Client**: Participates in weighted FedAvg rounds with Head Office (`$SERVER_IP:8080`), transmitting only NumPy model parameter updates (`coef_ (1, 17)` and `intercept_ (1,)`).

---

## 2. Directory Structure
```
Bank-A/
├── .env.example              # Environment variables template
├── .env                      # Local node configuration
├── requirements.txt          # Pinned Python package dependencies
├── preprocessing.json        # 17-feature schema, order, clip limits & standardization
├── split_dataset.py          # Skewed 70/30 dataset partitioner (Bank A: 70% below median income)
├── seed_data.py              # Initial staff credentials & sample loan applications
├── client.py                 # Flower NumPyClient connecting to Head Office (:8080)
├── test_bank_a_contract.py   # Automated contract conformance verification suite
├── PROGRESS.md               # Session progress tracking log
│
├── backend/                  # FastAPI Application (Port 8001)
│   ├── config.py             # Pydantic BaseSettings loading .env
│   ├── database.py           # SQLAlchemy database session & engine
│   ├── models.py             # Database models (employees, customers, loan_applications, etc.)
│   ├── schemas.py            # Frozen enums & Pydantic request/response schemas
│   ├── auth.py               # Employee bcrypt auth & Customer JWT verification
│   ├── fraud.py              # HMAC-SHA256 fingerprint hashing & local fraud scoring
│   ├── head_office_client.py # HTTP client with heartbeat & offline retry queue
│   └── server.py             # FastAPI entry point & API endpoints
│
├── ml/                       # Local Machine Learning Engine
│   ├── model.py              # 17-feature Logistic Regression wrapper
│   └── shap_explainer.py     # SHAP LinearExplainer contribution calculation
│
└── frontend/                 # Bank Employee Portal (React + Vite + Tailwind CSS)
    ├── src/
    │   ├── api.js            # Frontend REST client
    │   ├── App.jsx           # Main portal shell & authentication router
    │   └── components/
    │       ├── Header.jsx    # Bank A branding & network telemetry
    │       ├── Sidebar.jsx   # Section navigation
    │       ├── DashboardView.jsx # KPI cards & urgent work queue
    │       ├── ApplicationsView.jsx # Searchable & filterable loan queue
    │       ├── ApplicationDetailModal.jsx # Full KYC review, AI scoring & decision
    │       ├── CustomersView.jsx # Customer directory & KYC management
    │       ├── TrainingView.jsx # FL management console & telemetry
    │       └── SettingsView.jsx # Node connectivity parameters
    ├── package.json
    └── vite.config.js
```

---

## 3. Environment Variables Configuration (`.env`)
```bash
BANK_ID=BANK_A
BANK_NAME="HDFC Retail Bank"
BANK_API_PORT=8001
SERVER_IP=100.x.y.z               # Head Office Tailscale IP (or 127.0.0.1 for local dev)
API_PORT=8000                     # Head Office REST API Port
FLOWER_PORT=8080                  # Head Office Flower FL Server Port
HEAD_OFFICE_API_KEY=bank_a_dev_key_change_in_prod
CUSTOMER_JWT_SECRET=fedcredit_customer_dev_secret_2026
EMPLOYEE_JWT_SECRET=bank_a_local_secret_2026
FRAUD_SECRET=shared_demo_fraud_secret_between_banks
PORTAL_ORIGIN=http://localhost:5173
DATABASE_URL=sqlite:///./bank_a.db
DATASET_PATH=./data/bank_a_train.json
TEST_DATASET_PATH=./data/common_test.json
```

---

## 4. How to Run Bank A

### Step 1: Install Dependencies
```bash
# Python backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Generate Partitioned Dataset
```bash
python split_dataset.py --bank A --seed 42
```
*Creates Bank A's skewed training partition (`./data/bank_a_train.json`) with 70% below median income + 30% above median income, reserving a common 20% test set (`./data/common_test.json`).*

### Step 3: Seed Initial Data
```bash
python seed_data.py
```
*Creates initial staff credentials (`officer` / `password123`), KYC profiles, and demo applications.*

### Step 4: Run Contract Verification Test Suite
```bash
python test_bank_a_contract.py
```
*Validates that all endpoints conform to the frozen contract.*

### Step 5: Start Bank A Backend Server (Port 8001)
```bash
python backend/server.py
# Or with uvicorn:
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```
- API Docs: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/api/health`

### Step 6: Start Bank Employee Portal (Frontend)
```bash
cd frontend
npm run dev
```
Open `http://localhost:5174` in your browser.  
Log in with:
- **Username**: `officer`
- **Password**: `password123`

### Step 7: Participate in Federated Learning
When Head Office initiates training:
```bash
python client.py
```
*Connects to `$SERVER_IP:$FLOWER_PORT`, loads local dataset, participates in FedAvg rounds, and saves updated global parameters to `models/global_vN.json`.*

---

## 5. API Endpoints Reference

### Inbound Endpoints (Public / Customer Portal)
- `GET /api/health` — Node health, bank ID, and sync timestamp.
- `POST /api/applications` — Inbound multipart loan application submission with Customer Bearer JWT and fingerprint image.

### Bank Employee Endpoints (Bearer Employee JWT)
- `POST /api/auth/login` — Staff authentication.
- `GET /api/auth/me` — Staff profile.
- `GET /api/dashboard/stats` — Dashboard KPI metrics cards.
- `GET /api/loan-applications?status=&search=` — Filterable loan application queue.
- `GET /api/loan-applications/{id}` — Complete application dossier.
- `POST /api/loan-applications/{id}/predict` — Runs 17-feature ML inference + SHAP explanations + dual-layer fraud check.
- `POST /api/loan-applications/{id}/decision` — Records `APPROVED`, `REJECTED`, or `ON_HOLD` decision and updates Head Office.
- `POST /api/loan-applications/{id}/flag` — Submits manual fraud flag to Head Office registry.
- `GET /api/customers` & `POST /api/customers` — Customer KYC CRUD.
- `POST /api/training/local/start` — Triggers local baseline model fitting.
- `GET /api/training/logs` — Training rounds telemetry logs.
