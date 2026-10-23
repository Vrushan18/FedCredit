# FedCredit: Privacy-Preserving Federated Credit Risk Prediction

> **A Production-Grade Distributed Banking Ecosystem with Explainable AI (XAI) and Zero-Knowledge Fraud Detection**

---

## 🏛️ Executive Overview

Traditional financial credit risk systems rely on centralized aggregation of customer demographic, transactional, and personal identifiable information (PII). In multi-institutional commercial banking, this model faces severe legal, regulatory, and architectural roadblocks (e.g., **DPDP Act 2023**, **GDPR Article 22**, and **RBI Data Localization Mandates**). 

**FedCredit** eliminates the need for centralized customer data pooling by leveraging **Federated Learning (FL)**:
- **Zero Raw Data Sharing**: Machine learning models train strictly on-premise on sovereign bank nodes. Only model parameter updates (weights and bias vectors) are exchanged.
- **Explainable AI (SHAP)**: Global consensus weights are coupled with localized Linear SHAP feature attribution to decompose credit decisions into plain-language positive and negative factors for loan officers.
- **Privacy-Preserving Fraud Prevention**: Cross-institutional loan stacking and identity duplication are eradicated via HMAC-SHA256 biometric fingerprint hashing with immediate raw image disposal from memory.
- **Synthetic Identity Defense**: Local Aadhaar-to-biometric cryptographic binding detects identity impersonation attempts directly at branch intake.

---

## 🌐 System Architecture

```
                                 [ HEAD OFFICE (Laptop 1) ]
                                 • Lead: Vrushan Patil
                                 • FastAPI Orchestrator (:8000)
                                 • Flower FL Server (:8080 gRPC)
                                 • Central Fraud Registry
                                 • Real-Time Telemetry Dashboard
                                      /                 \
                     Encrypted Mesh  /                   \  Encrypted Mesh
                       (Tailscale)  /                     \   (Tailscale)
                                   /                       \
                 [ BANK A (Laptop 2) ]                 [ BANK B (Laptop 3) ]
                 • Lead: Gopal Prusty                  • Lead: Nidhi Chougule
                 • HDFC Retail Division                • State Co-operative Division
                 • Port :8001 / Portal :5174           • Port :8002 / Portal :5175
                 • Retail Skew (70% Low Income)        • Commercial Skew (70% High Income)
                 • Local 17-Feature Logistic Model     • Local 17-Feature Logistic Model
                 • Linear SHAP Factor Explainer        • Linear SHAP Factor Explainer
                 • Sovereign SQLite (bank_a.db)        • Sovereign SQLite (bank_b.db)
                 • Aadhaar-Biometric Binding Check     • Aadhaar-Biometric Binding Check
                                   \                       /
                                    \                     /
                                   [ CUSTOMER PORTAL (Laptop 4) ]
                                   • Lead: Aditya Tambe
                                   • React 19 + Vite SPA (:5173)
                                   • Verhoeff Aadhaar Checksum Validator
                                   • PAN Individual 'P' Verification
                                   • Canvas Biometric Ridge Variance (σ ≥ 28)
                                   • Two-Step Consortium Submission
```

---

## 📁 Repository Structure

```
FedCredit/
├── .gitignore                    # Git rules excluding secrets, databases, uploads & cache
├── README.md                     # Comprehensive technical documentation
├── requirements.txt              # Pinned consortium Python dependencies
│
├── shared/                       # Canonical contracts shared across consortium
│   ├── openapi.json              # Frozen REST API contract definitions
│   ├── preprocessing.json        # Deterministic 17-feature scaling parameters
│   └── split_dataset.py          # Synthetic dataset generator & 70/30 non-IID partitioner
│
├── admin-server/                 # Head Office Orchestration & FL Server (Laptop 1: Vrushan Patil — Port 8000 & 8080)
│   ├── .env.example              # Template environment configuration
│   ├── auth.py                   # Bcrypt hashing & Dual-Secret JWT auth (Admin & Customer)
│   ├── config.py                 # Pydantic environment settings
│   ├── database.py               # Thread-safe SQLite persistence layer
│   ├── flower_service.py         # Flower gRPC server with custom FedCreditStrategy
│   ├── run.py                    # Server lifecycle runner
│   ├── run_smoke_test.bat        # Automated sanity check script
│   ├── schemas.py                # Strict Pydantic request/response schemas
│   ├── seed_data.py              # Demo database seed script
│   ├── server.py                 # FastAPI endpoints & Chart.js admin dashboard
│   ├── services.py               # Fraud registry engine & heartbeat evaluation worker
│   ├── start.bat                 # One-click startup script
│   ├── test_consortium_crosscheck.py # Cross-bank protocol verification
│   ├── models/                   # Global federated model checkpoints (global_v1..latest.json)
│   └── tests/
│       └── test_endpoints.py     # 9-stage automated contract test suite
│
├── customer-portal/              # Customer Facing Web Portal (Laptop 4: Aditya Tambe — Port 5173)
│   ├── .env.example              # Template environment with VITE_HEAD_OFFICE_URL
│   ├── package.json              # React 19, Vite, Tailwind CSS v4 dependencies
│   ├── src/
│   │   ├── components/
│   │   │   └── LoanApplicationForm.jsx # Interactive loan form & live DTI calculator
│   │   ├── utils/
│   │   │   ├── validation.js     # Verhoeff Aadhaar & PAN individual 'P' validator
│   │   │   └── biometricCheck.js # In-browser canvas fingerprint ridge variance check
│   │   ├── services/
│   │   │   └── api.js            # Two-step consortium submission dispatcher
│   │   └── pages/                # Multi-bank loan application pages & dashboard
│
└── bank-a/                       # Bank A Local Node — HDFC Retail Division (Laptop 2: Gopal Prusty — Port 8001 / 5174)
    ├── .env.example              # Node configuration template (Ports, Tailscale IPs, secrets)
    ├── client.py                 # Flower FL client for federated parameter aggregation (:8080)
    ├── crypto_utils.py           # HMAC-SHA256 biometric tokenizer & Aadhaar-biometric binding verification
    ├── head_office_client.py     # Authenticated REST communicator with Head Office (:8000)
    ├── model_scorer.py           # Standardized 17-feature vector assembly & sigmoid inference
    ├── preprocessing.json        # Frozen 17-feature scaling & clipping schema
    ├── requirements.txt          # Node-specific Python dependencies
    ├── seed_data.py              # Branch staff credentials (officer/manager) & demo applications
    ├── server.py                 # Standalone branch node FastAPI server (:8001)
    ├── split_dataset.py          # 70/30 retail skew partitioner (70% below median income)
    ├── test_bank_a_contract.py   # Automated 6-stage contract conformance test suite
    ├── test_synthetic_fraud_check.py # Alice-Bob synthetic fraud verification suite
    ├── backend/                  # Enterprise FastAPI service with ORM models, auth, and retry queue
    │   ├── auth.py               # Staff bcrypt authentication & JWT issue/verification
    │   ├── config.py             # Pydantic BaseSettings loading local .env
    │   ├── crypto_utils.py       # Deterministic salted tokenization
    │   ├── database.py           # Thread-safe SQLAlchemy session engine
    │   ├── fraud.py              # Dual-tier fraud scoring & local heuristics
    │   ├── head_office_client.py # Async & sync Head Office REST client with offline retry queue
    │   ├── models.py             # SQLAlchemy models (customers, loans, kyc_bindings, training_logs)
    │   ├── model_scorer.py       # Credit risk scoring wrappers
    │   ├── schemas.py            # Strict Pydantic frozen schemas & error envelopes
    │   └── server.py             # FastAPI entry point & employee API endpoints
    ├── data/                     # Sovereign partitioned training & common test data
    │   ├── bank_a_train.json     # 70% low-income skewed partition (4,800 records)
    │   └── common_test.json      # Unbiased held-out test partition (2,400 records)
    ├── ml/                       # Local Machine Learning & Explainability Engine
    │   ├── model.py              # Scikit-learn Logistic Regression wrapper
    │   └── shap_explainer.py     # Linear SHAP feature attribution calculator
    ├── models/                   # Local & federated model parameter checkpoints
    │   └── global_model.json
    └── frontend/                 # Bank Employee Portal (React 19 + Vite + Tailwind CSS v4 on Port 5174)
        ├── src/
        │   ├── App.jsx           # Portal shell & route manager
        │   ├── api.js            # Frontend REST client with bearer token injection
        │   └── components/
        │       ├── Header.jsx    # Bank A branding & network telemetry indicator
        │       ├── Sidebar.jsx   # Section navigation
        │       ├── DashboardView.jsx # KPI cards & urgent work queue
        │       ├── ApplicationsView.jsx # Searchable & filterable loan queue
        │       ├── ApplicationDetailModal.jsx # Full KYC review, AI scoring & SHAP waterfall
        │       ├── CustomersView.jsx # Customer directory & KYC management
        │       ├── TrainingView.jsx # FL management console & telemetry
        │       └── SettingsView.jsx # Node connectivity parameters
        ├── package.json
        └── vite.config.js
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.12 & 3.14)
- **Node.js 18+** & npm
- **Git**

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/Vrushan18/FedCredit.git
cd FedCredit

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Launch Head Office Node (Laptop 1: Vrushan Patil)
```bash
cd admin-server
cp .env.example .env

# Seed initial test data
python seed_data.py

# Run contract tests
python -m pytest tests/test_endpoints.py -v

# Start FastAPI server on port 8000
python run.py

# In a separate terminal, start Flower Federated Learning Server on port 8080:
python flower_service.py
```
* Head Office Dashboard: `http://localhost:8000/dashboard`
* REST API Base: `http://localhost:8000/api/v1`

---

### 4. Launch Customer Portal (Laptop 4: Aditya Tambe)
```bash
cd customer-portal
cp .env.example .env
npm install
npm run dev
```
* Customer Web Portal: `http://localhost:5173`

---

### 5. Launch Bank A Node — HDFC Retail (Laptop 2: Gopal Prusty)

```bash
cd bank-a
cp .env.example .env

# Generate 70/30 retail skewed partition (Bank A: 70% below median income)
python split_dataset.py --bank A --seed 42

# Seed initial branch staff credentials (officer / password123) and sample applications
python seed_data.py

# Run Bank A contract tests and synthetic fraud verification
python test_bank_a_contract.py
python test_synthetic_fraud_check.py

# Start Bank A Backend Server (Port 8001)
python backend/server.py

# In a separate terminal, start Bank Employee Portal (Port 5174):
cd frontend
npm install
npm run dev
```
* Bank A Backend API: `http://localhost:8001`
* API Documentation (Swagger): `http://localhost:8001/docs`
* Health Check: `http://localhost:8001/api/health`
* Bank Employee Portal: `http://localhost:5174` (Login: `officer` / `password123`)

#### Participate in Federated Learning:
When Head Office initiates federated training rounds:
```bash
cd bank-a
python client.py
```
*Connects to `$SERVER_IP:$FLOWER_PORT`, loads local partition (`./data/bank_a_train.json`), runs local epoch, transmits weight updates, and receives aggregated global model parameters.*

---

## 🛡️ Cross-Verification & Fraud Defenses Matrix

| Scenario Tested | Fraud / Error Type | Intercepting Node | Technical Mechanism |
|:---|:---|:---|:---|
| **Fake / Random 12-digit Aadhaar** | Syntax Checksum Fraud | Laptop 4 (Customer Portal) | Verhoeff dihedral $D_5$ algorithm computation in browser |
| **Corporate or Firm PAN Card** | Ineligible Retail Category | Laptop 4 (Customer Portal) | Regex pattern enforcing 4th character strictly equals `'P'` |
| **Age 20 with 8 years employment** | Semantic Inconsistency | Laptop 4 (Customer Portal) | Business rule constraint: $\text{employment\_years} \le (\text{age} - 18)$ |
| **Blank canvas or selfie upload** | Fake Biometric Scan | Laptop 4 (Customer Portal) | Grayscale canvas pixel standard deviation threshold ($\sigma \ge 28$) |
| **Alice's Aadhaar with Bob's biometric** | Synthetic Identity Impersonation | Laptops 2 & 3 (Bank Nodes) | Local `customer_kyc_bindings` mismatch check in SQLite (`bank_a.db`) |
| **Simultaneous loan at Bank A & Bank B** | Cross-Bank Loan Stacking | Laptop 1 (Head Office Registry) | Deterministic HMAC-SHA256 sighting collision within 30 days ($+35$ pts $\rightarrow$ `SUSPICIOUS`) |

---

## 📊 17-Feature Standardized Schema

To avoid target leakage and ensure mathematical consistency across participating banks, models evaluate a strict 17-feature vector:

| Index | Feature | Type | Description |
|:---:|:---|:---:|:---|
| 1 | `person_age` | Numeric | Applicant age (clipped [18, 100]) |
| 2 | `person_income` | Numeric | Annual income in INR (standardized) |
| 3 | `person_emp_length` | Numeric | Employment tenure in years |
| 4 | `loan_amnt` | Numeric | Requested principal loan amount |
| 5 | `loan_percent_income` | Numeric | Debt-to-income ratio |
| 6 | `cb_person_cred_hist_length` | Numeric | Credit history length in years |
| 7 | `previous_default` | Binary | Prior default record indicator (0/1) |
| 8–11 | `home_ownership_[4]` | One-Hot | Residential status: RENT, OWN, MORTGAGE, OTHER |
| 12–17 | `loan_purpose_[6]` | One-Hot | EDUCATION, MEDICAL, VENTURE, PERSONAL, DEBT_CONSOLIDATION, HOME_IMPROVEMENT |

---

## 🔒 Privacy & Security Model

- **No Raw Data Pooling**: Raw KYC files, financial statements, and credit history remain strictly inside local bank databases.
- **Cryptographic Protected Identifiers**: Raw biometrics are hashed on-premise using `HMAC-SHA256(FRAUD_SECRET, fingerprint_bytes)` and purged from RAM immediately. The central registry only ever sees an irreversible 64-character hexadecimal digest.
- **Dual-Tier Fraud Detection**: Synthesizes cross-bank velocity sighting penalties (central) with debt-to-income policy heuristics (local).
- **Synthetic Identity Binding**: Salted hashes of government identity tokens (Aadhaar) are bound to biometric hashes on-premise, preventing credential stuffing and synthetic borrowing.
- **Adjudication Override (Frozen Rule 2)**: Any applicant with a fraud status of `REVIEW_NEEDED` or `SUSPICIOUS` cannot receive an automated `ELIGIBLE` status, requiring mandatory human review.

---

## 📈 Empirical Benchmarks

Trained across non-uniform demographic distributions (70/30 income skew):
- **Bank A (Retail Skew - 70% Low Income)**: 76.2% AUC-ROC
- **Bank B (Commercial Skew - 70% High Income)**: 78.4% AUC-ROC
- **FedCredit Consensus (FedAvg)**: **88.4% AUC-ROC** (+12.2% gain, approaching the 89.1% centralized upper bound with zero data leakage).

---

## 👥 Authors & Project Team

- **Vrushan Patil** (Lead: Head Office Orchestration, FL Engine & Fraud Registry)
- **Nidhi Chougule** (Bank B Local Node & Demographic Skew Lead)
- **Gopal Prusty** (Bank A Local Node & Branch Adjudication Lead)
- **Aditya Tambe** (Autonomous Customer Self-Service Portal Lead)

*Project Guide: **Prof. Manoj Suryawanshi***  
*Department of Electronics & Computer Science, Vidyalankar Institute of Technology, University of Mumbai.*
