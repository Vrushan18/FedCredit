# Bank B (State Co-op Bank) — FedCredit System Module

Comprehensive implementation and technical documentation for the Bank B module of the **FedCredit Privacy-Preserving Federated Credit Risk Assessment & Fraud Detection System**.

---

## 1. Architecture Overview

Bank B operates as an independent, privacy-preserving core banking node for employee credit officers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BANK B LOCAL NODE                                │
│                                                                             │
│  ┌───────────────────────┐             ┌─────────────────────────────────┐  │
│  │   React + Vite Frontend│ ◄──HTTP/JWT─►│       FastAPI Backend           │  │
│  │   (Port 5174 / Dev)   │             │       (Port 8002)               │  │
│  └───────────────────────┘             └────────────────┬────────────────┘  │
│                                                         │                   │
│                                    ┌────────────────────┼────────────────┐  │
│                                    ▼                    ▼                ▼  │
│                             ┌─────────────┐     ┌──────────────┐  ┌──────────┐│
│                             │ PostgreSQL  │     │   Local ML   │  │   SHAP   ││
│                             │ bank_b_db   │     │ (LogReg 17-F)│  │Explainer ││
│                             └─────────────┘     └──────────────┘  └──────────┘│
└────────────────────────────────────┬────────────────────┬───────────────────┘
                                     │                    │
                          Outbound   │                    │ Outbound
                        HMAC Check   │                    │ Parameter Exchange
                                     ▼                    ▼
                        ┌──────────────────┐        ┌──────────────────┐
                        │   Head Office    │        │  Flower FL Server│
                        │ Fraud Registry   │        │   (Port 8080)    │
                        └──────────────────┘        └──────────────────┘
```

---

## 2. API Endpoints & Specifications

### Authentication & Health
- `GET /api/health` — System health check & database connectivity status.
- `POST /api/auth/employee/login` — Authenticates Bank B officers, returning JWT bearer token.
- `GET /api/auth/me` — Fetches current authenticated employee profile.

### Customer Management
- `POST /api/customers` — Registers a new Bank B customer with local KYC fields.
- `GET /api/customers` — Searches & lists customers (`q` query parameter).
- `GET /api/customers/{customer_id}` — Fetches customer profile by ID.
- `PUT /api/customers/{customer_id}` — Updates customer profile details.

### Loan Applications
- `POST /api/applications` — Creates a new credit loan application.
- `GET /api/applications` — Lists loan applications with optional status filtering.
- `GET /api/applications/{application_id}` — Fetches application details & customer info.
- `PATCH /api/applications/{application_id}/status` — Updates status (`SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED`).

### Risk Prediction & SHAP
- `POST /api/predictions` — Computes 17-feature default probability & risk tier (`LOW`, `MEDIUM`, `HIGH`).
- `GET /api/applications/{application_id}/predictions` — Fetches stored predictions & top SHAP feature drivers.

### Privacy-Preserving Fraud Registry
- `POST /api/fraud/check` — Generates 64-char HMAC Protected ID and checks Head Office fraud registry.
- `POST /api/fraud/flag` — Manually flags an application for fraud review.
- `GET /api/fraud/status/{application_id}` — Retrieves local & Head Office fraud status.

---

## 3. Database Schema

Production database is **PostgreSQL** (`bank_b_db`). SQLite (`bank_b.db`) is supported solely as an explicitly logged local development fallback.

### Primary Tables
1. `employees` (`id`, `username`, `hashed_password`, `role`, `created_at`)
2. `customers` (`id`, `customer_id`, `name`, `age`, `gender`, `address`, `phone`, `occupation`, `employment_type`, `created_at`)
3. `loan_applications` (`id`, `application_id`, `customer_id`, `income`, `employment_length_years`, `debt`, `credit_score`, `loan_amount`, `loan_purpose`, `home_ownership`, `previous_default`, `status`, `created_at`, `updated_at`)
4. `predictions` (`id`, `prediction_id`, `application_id`, `default_probability`, `risk_level`, `recommendation`, `created_at`)
5. `local_training_logs` (`id`, `round_number`, `samples_count`, `accuracy`, `sync_status`, `created_at`)
6. `fraud_flags` (`id`, `application_id`, `protected_id`, `fraud_status`, `reason`, `flagged_by`, `created_at`)

---

## 4. Security & Privacy Model

1. **Local Employee Auth**: Bcrypt password hashing and JWT token authorization.
2. **Biometric Privacy**: Raw fingerprint images are **never stored**. Only 64-character lowercase hexadecimal HMAC-SHA256 Protected IDs (`HMAC-SHA256(FRAUD_SECRET, fingerprint_bytes)`) are generated and queried.
3. **Head Office Auth**: All requests send `X-API-Key: HEAD_OFFICE_API_KEY`.
4. **Federated Privacy**: Outbound Flower payloads contain **ONLY** model parameter arrays `[(1, 17), (1,)]` and numeric scalars (`accuracy`, `loss`). Customer PII, raw feature rows, biometrics, SHAP values, and fraud flags are strictly blocked from network egress.

---

## 5. Machine Learning & 17-Feature Schema

### Canonical 17-Feature Order
1. `age`
2. `annual_income`
3. `employment_length_years`
4. `loan_amount`
5. `loan_percent_income`
6. `credit_history_length_years`
7. `previous_default`
8. `home_ownership_RENT`
9. `home_ownership_OWN`
10. `home_ownership_MORTGAGE`
11. `home_ownership_OTHER`
12. `loan_purpose_EDUCATION`
13. `loan_purpose_MEDICAL`
14. `loan_purpose_VENTURE`
15. `loan_purpose_PERSONAL`
16. `loan_purpose_DEBT_CONSOLIDATION`
17. `loan_purpose_HOME_IMPROVEMENT`

- **Model Wrapper**: `BankBModel` (`ml/model.py`) wrapping scikit-learn Logistic Regression.
- **Parameter Contract**: `coef_` shape `(1, 17)`, `intercept_` shape `(1,)`.
- **Configurable Risk Mapping**:
  - `default_prob < low_risk_threshold (0.30)` → `LOW` risk (`ELIGIBLE`)
  - `default_prob < high_risk_threshold (0.60)` → `MEDIUM` risk (`HOLD_FOR_VERIFICATION`)
  - `default_prob >= high_risk_threshold (0.60)` → `HIGH` risk (`NOT_RECOMMENDED`)

---

## 6. Explainable AI (SHAP)

- **Explainer**: `BankBSHAPExplainer` (`shap/explainer.py`) wrapping `shap.LinearExplainer`.
- Computes exact 17-element feature contribution vector aligned with `FEATURE_NAMES`.
- Ranks positive risk drivers (increasing default risk) and negative risk drivers (lowering default risk).

---

## 7. Federated Learning (Flower Client)

- **Client Class**: `BankBFlowerClient(flwr.client.NumPyClient)` (`flower_client/client.py`).
- **Parameter Conversions**: `sklearn_to_parameters()` and `parameters_to_sklearn()` (`flower_client/utils.py`). Rejects malformed dimension shapes with `ValueError`.
- **Dataset Blocker**: If `shared/preprocessing.json` or `bank_B_train.json` are absent, `fit()` and `evaluate()` raise `DatasetBlockerException` without fabricating fake metrics.

---

## 8. Environment Configuration

Defined in `.env`:
```env
PORT=8002
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bank_b_db
DEV_FALLBACK_DATABASE_URL=sqlite:///./bank_b.db
EMPLOYEE_JWT_SECRET=bank_b_local_secret_2026
FRAUD_SECRET=shared_demo_fraud_secret_between_banks
HEAD_OFFICE_API_KEY=bank_b_dev_key_change_in_prod
SERVER_IP=100.127.141.31

API_PORT=8000
FLOWER_PORT=8080
ML_LOW_RISK_THRESHOLD=0.30
ML_HIGH_RISK_THRESHOLD=0.60
```

---

## 9. Running Bank B Locally

### Backend Server
```bash
cd bank-b
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend UI
```bash
cd bank-b/frontend
npm run dev
```

---

## 10. Automated Testing Commands

### Backend Pytest (45 Tests Across 10 Modules)
```bash
cd bank-b
python -m pytest -v
```

### Frontend Build
```bash
cd bank-b/frontend
npm run build
```

---

## 11. Known Blockers & External Integration Requirements

| Dependency / Component | Integration Status | Notes / Blocker Description |
| :--- | :--- | :--- |
| **Canonical Shared Preprocessing** | `BLOCKED` | `shared/preprocessing.json` absent from workspace. Preprocessing raises `DatasetBlockerException`. |
| **Bank B Training Dataset** | `BLOCKED` | `bank_B_train.json` absent from workspace. Local training & federated rounds raise `DatasetBlockerException`. |
| **Head Office Fraud Server** | `EXTERNALLY DEPENDENT` | When unreachable, Bank B API returns `503 SERVICE_UNAVAILABLE` without fake fraud status. |
| **Flower Server** | `EXTERNALLY DEPENDENT` | When unreachable, `start_bank_b_flower_client()` raises clean `ConnectionError`. |
| **Customer Portal & Bank A** | `OUT OF SCOPE` | Independent external modules not modified by Bank B. |
