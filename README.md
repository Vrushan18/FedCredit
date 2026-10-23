# FedCredit: Privacy-Preserving Federated Credit Risk Prediction

> **A Production-Grade Distributed Banking Ecosystem with Explainable AI (XAI) and Zero-Knowledge Fraud Detection**

---

## 📌 Executive Overview

Traditional financial credit risk systems rely on centralized aggregation of customer demographic, transactional, and personal identifiable information (PII). In multi-institutional commercial banking, this model faces severe legal, regulatory, and architectural roadblocks (e.g., **DPDP Act 2023**, **GDPR Article 22**, and **RBI Data Localization Mandates**). 

**FedCredit** eliminates the need for centralized customer data pooling by leveraging **Federated Learning (FL)**:
- **Zero Raw Data Sharing**: Machine learning models train strictly on-premise on sovereign bank nodes. Only model parameter updates (weights and bias vectors) are exchanged.
- **Explainable AI (SHAP)**: Global consensus weights are coupled with localized Linear SHAP feature attribution to decompose credit decisions into plain-language positive and negative factors for loan officers.
- **Privacy-Preserving Fraud Prevention**: Cross-institutional loan stacking and identity duplication are eradicated via HMAC-SHA256 biometric fingerprint hashing with immediate raw image disposal from memory.

---

## 🏛️ System Architecture

```
                                 [ HEAD OFFICE (Laptop 1) ]
                                 • FastAPI Orchestrator (:8000)
                                 • Flower FL Server (:8080 gRPC)
                                 • Central Fraud Registry
                                 • Real-Time Telemetry Dashboard
                                      /                 \
                     Encrypted Mesh  /                   \  Encrypted Mesh
                       (Tailscale)  /                     \   (Tailscale)
                                   /                       \
                 [ BANK A (Laptop 2) ]                 [ BANK B (Laptop 3) ]
                 • Retail Demographics (70% Low)       • Commercial Demographics (70% High)
                 • Local Logistic Model                • Local Logistic Model
                 • SHAP Linear Explainer               • SHAP Linear Explainer
                 • Sovereign SQLite DB                 • Sovereign SQLite DB
```

---

## 📂 Repository Structure

```
FedCredit-Code/
├── .gitignore                    # Git rules excluding secrets, databases & cache
├── README.md                     # Comprehensive technical documentation
├── requirements.txt              # Pinned Python dependencies
│
├── shared/                       # Canonical contracts shared across consortium
│   ├── openapi.json              # Frozen REST API contract definitions
│   ├── preprocessing.json        # Deterministic 17-feature scaling parameters
│   └── split_dataset.py          # Synthetic dataset generator & 70/30 non-IID partitioner
│
└── admin-server/                 # Head Office Orchestration & FL Server (Laptop 1)
    ├── .env.example              # Template environment configuration
    ├── auth.py                   # Bcrypt hashing & Dual-Secret JWT auth (Admin & Customer)
    ├── config.py                 # Pydantic environment settings
    ├── database.py               # Thread-safe SQLite persistence layer
    ├── flower_service.py         # Flower gRPC server with custom FedCreditStrategy
    ├── run.py                    # Server lifecycle runner
    ├── run_smoke_test.bat        # Automated sanity check script
    ├── schemas.py                # Strict Pydantic request/response schemas
    ├── seed_data.py              # Demo database seed script
    ├── server.py                 # FastAPI endpoints & Chart.js admin dashboard
    ├── services.py               # Fraud registry engine & heartbeat evaluation worker
    ├── start.bat                 # One-click startup script
    ├── test_consortium_crosscheck.py # Cross-bank protocol verification
    ├── models/                   # Global federated model checkpoints
    │   ├── global_v1.json
    │   ├── global_v2.json
    │   ├── global_v3.json
    │   └── global_latest.json
    └── tests/
        └── test_endpoints.py     # 9-stage automated contract test suite
│
└── customer-portal/              # Customer Facing Web Portal (Laptop 4: Aditya Tambe — Port 5173)
    ├── .env.example              # Template environment with VITE_HEAD_OFFICE_URL
    ├── package.json              # React 19, Vite, Tailwind CSS v4 dependencies
    ├── src/
    │   ├── components/
    │   │   └── LoanApplicationForm.jsx # Interactive loan form & live DTI calculator
    │   ├── utils/
    │   │   ├── validation.js     # Verhoeff Aadhaar & PAN individual 'P' validator
    │   │   └── biometricCheck.js # In-browser canvas fingerprint ridge variance check
    │   ├── services/
    │   │   └── api.js            # Two-step consortium submission dispatcher
    │   └── pages/                # Multi-bank loan application pages & dashboard
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.12 & 3.14)
- **Git**

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/<your-username>/FedCredit-Code.git
cd FedCredit-Code

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Inside `admin-server/`, copy `.env.example` to `.env`:
```bash
cd admin-server
cp .env.example .env
```
Ensure secrets and ports match your deployment setup.

### 4. Seed Database & Run Sanity Tests
```bash
# Seed initial test data (customers, demo applications, sightings)
python seed_data.py

# Run contract tests
python -m pytest tests/test_endpoints.py -v
```

### 5. Launch the Head Office Orchestrator
```bash
# Start FastAPI server on port 8000
python run.py
```
Open **`http://localhost:8000/dashboard`** to view the live administrative console.

### 6. Start the Federated Learning Server
In a separate terminal (with virtual environment active):
```bash
cd admin-server
python flower_service.py
```
The Flower FL server will listen on **`0.0.0.0:8080`**, awaiting client connections from participating bank nodes.

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
- **Adjudication Override (Frozen Rule 2)**: Any applicant with a fraud status of `REVIEW_NEEDED` or `SUSPICIOUS` cannot receive an automated `ELIGIBLE` status, requiring mandatory human review.

---

## 📈 Empirical Benchmarks

Trained across non-uniform demographic distributions (70/30 income skew):
- **Bank A (Retail)**: 76.2% AUC-ROC
- **Bank B (Commercial)**: 78.4% AUC-ROC
- **FedCredit Consensus (FedAvg)**: **88.4% AUC-ROC** (+12.2% gain, approaching the 89.1% centralized upper bound with zero data leakage).

---

## 👥 Authors & Project Team

- **Vrushan Patil** (Lead: Head Office Orchestration, FL Engine & Fraud Registry)
- **Nidhi Chougule** (Bank B Local Node & Demographic Skew Lead)
- **Gopal Prusty** (Bank A Local Node & Branch Adjudication Lead)
- **Aditya Tambe** (Autonomous Customer Self-Service Portal Lead)

*Project Guide: **Prof. Manoj Suryawanshi***  
*Department of Electronics & Computer Science, Vidyalankar Institute of Technology, University of Mumbai.*
