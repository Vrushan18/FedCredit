-- Bank B (State Co-op Bank) Local Database Schema
-- Database: bank_b_db

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER' NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    occupation VARCHAR(100) NOT NULL,
    employment_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_applications (
    application_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    income DOUBLE PRECISION NOT NULL,
    employment_length_years DOUBLE PRECISION NOT NULL,
    debt DOUBLE PRECISION NOT NULL,
    credit_score INT NOT NULL,
    loan_amount DOUBLE PRECISION NOT NULL,
    loan_purpose VARCHAR(100) NOT NULL,
    home_ownership VARCHAR(50) NOT NULL,
    previous_default INT DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_documents (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id),
    file_path TEXT NOT NULL,
    doc_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id),
    risk_level VARCHAR(20) NOT NULL,
    default_prob DOUBLE PRECISION NOT NULL,
    recommendation VARCHAR(50) NOT NULL,
    shap_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_training_logs (
    id SERIAL PRIMARY KEY,
    round INT NOT NULL,
    local_loss DOUBLE PRECISION NOT NULL,
    local_accuracy DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_flags (
    id SERIAL PRIMARY KEY,
    protected_id VARCHAR(64) NOT NULL,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id),
    reason TEXT NOT NULL,
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_kyc_bindings (
    aadhaar_hash VARCHAR(64) PRIMARY KEY,
    protected_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_protected_id ON fraud_flags(protected_id);
