"""
Dataset Partitioner for Federated Credit Risk System
Conforms to Team Contract Section 6:
- Reserves 20% test set first.
- Skewed partition: Bank A gets 70% below-median-income + 30% above; Bank B the reverse.
- Seeds with 42 by default.
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd

def generate_synthetic_credit_dataset(n_samples: int = 10000, seed: int = 42) -> pd.DataFrame:
    """Generates synthetic credit dataset matching Kaggle credit risk dataset distributions in INR."""
    rng = np.random.default_rng(seed)
    
    age = np.clip(rng.normal(32, 8, n_samples).astype(int), 18, 75)
    
    # Incomes in INR (from 250k to 2.5m)
    log_income = rng.normal(13.2, 0.6, n_samples)
    annual_income = np.clip(np.exp(log_income), 200000, 5000000).round(-3)
    
    home_ownership_choices = ["RENT", "OWN", "MORTGAGE", "OTHER"]
    home_ownership = rng.choice(home_ownership_choices, size=n_samples, p=[0.50, 0.15, 0.30, 0.05])
    
    employment_length = np.clip(rng.exponential(5, n_samples).astype(int), 0, 40)
    
    loan_purposes = ["EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT"]
    loan_purpose = rng.choice(loan_purposes, size=n_samples, p=[0.18, 0.12, 0.15, 0.25, 0.20, 0.10])
    
    # Loan amount proportional to income
    pct_income = np.clip(rng.beta(2, 5, n_samples) * 0.7, 0.05, 0.8)
    loan_amount = (annual_income * pct_income).round(-3)
    loan_amount = np.clip(loan_amount, 50000, 3000000)
    loan_percent_income = np.round(loan_amount / annual_income, 4)
    
    credit_hist_len = np.clip((age - 20) * rng.uniform(0.3, 0.8, n_samples), 1, 30).astype(int)
    
    # Previous default
    prob_prev_default = np.clip(0.1 + 0.2 * (loan_percent_income > 0.4), 0.05, 0.45)
    previous_default = (rng.uniform(0, 1, n_samples) < prob_prev_default).astype(int)
    
    # Default risk (loan_status): higher if low income, high loan/income, previous default, RENT
    logits = (
        -2.5
        - 0.0000008 * annual_income
        + 4.0 * loan_percent_income
        + 1.2 * previous_default
        + 0.5 * (home_ownership == "RENT")
        - 0.4 * (home_ownership == "OWN")
        + 0.02 * (age < 25)
        - 0.03 * employment_length
    )
    p_default = 1 / (1 + np.exp(-logits))
    loan_status = (rng.uniform(0, 1, n_samples) < p_default).astype(int)
    
    df = pd.DataFrame({
        "age": age,
        "annual_income": annual_income,
        "home_ownership": home_ownership,
        "employment_length_years": employment_length,
        "loan_purpose": loan_purpose,
        "loan_amount": loan_amount,
        "loan_percent_income": loan_percent_income,
        "previous_default": previous_default,
        "credit_history_length_years": credit_hist_len,
        "loan_status": loan_status
    })
    return df

def split_and_partition(csv_path: str = None, bank: str = "A", seed: int = 42, output_dir: str = "./data"):
    os.makedirs(output_dir, exist_ok=True)
    
    if csv_path and os.path.exists(csv_path):
        print(f"Loading dataset from {csv_path}...")
        df = pd.read_csv(csv_path)
        # Map common Kaggle column names if needed
        col_map = {
            "person_age": "age",
            "person_income": "annual_income",
            "person_home_ownership": "home_ownership",
            "person_emp_length": "employment_length_years",
            "loan_intent": "loan_purpose",
            "loan_amnt": "loan_amount",
            "cb_person_default_on_file": "previous_default",
            "cb_person_cred_hist_length": "credit_history_length_years"
        }
        df = df.rename(columns=col_map)
        if "previous_default" in df.columns and df["previous_default"].dtype == object:
            df["previous_default"] = df["previous_default"].apply(lambda x: 1 if str(x).strip().upper() == "Y" else 0)
        if "loan_percent_income" not in df.columns:
            df["loan_percent_income"] = df["loan_amount"] / df["annual_income"]
    else:
        print(f"No CSV supplied or found at {csv_path}. Generating synthetic dataset with Kaggle distributions...")
        df = generate_synthetic_credit_dataset(n_samples=12000, seed=seed)
        
    # Exclude outcome leak columns if present
    leak_cols = ["loan_grade", "loan_int_rate"]
    for c in leak_cols:
        if c in df.columns:
            df = df.drop(columns=[c])

    # Ensure required columns
    required_cols = [
        "age", "annual_income", "home_ownership", "employment_length_years",
        "loan_purpose", "loan_amount", "loan_percent_income", "previous_default",
        "credit_history_length_years", "loan_status"
    ]
    df = df[required_cols].dropna().reset_index(drop=True)
    
    # 1. Reserve common 20% test set
    rng = np.random.default_rng(seed)
    shuffled_indices = rng.permutation(len(df))
    test_size = int(0.20 * len(df))
    test_idx = shuffled_indices[:test_size]
    train_pool_idx = shuffled_indices[test_size:]
    
    test_df = df.iloc[test_idx].reset_index(drop=True)
    train_pool_df = df.iloc[train_pool_idx].reset_index(drop=True)
    
    # Save common test set
    test_path = os.path.join(output_dir, "common_test.json")
    test_df.to_json(test_path, orient="records", indent=2)
    print(f"Saved common 20% test set ({len(test_df)} records) to {test_path}")
    
    # 2. Skewed partitioning on median income:
    median_income = train_pool_df["annual_income"].median()
    below_median = train_pool_df[train_pool_df["annual_income"] <= median_income].copy()
    above_median = train_pool_df[train_pool_df["annual_income"] > median_income].copy()
    
    print(f"Train pool median annual income: INR {median_income:,.0f}")
    print(f"Below median pool: {len(below_median)}, Above median pool: {len(above_median)}")
    
    bank_upper = bank.upper()
    if bank_upper == "A":
        # Bank A gets 70% below median, 30% above
        n_bank_samples = min(len(below_median) * 2, len(train_pool_df) // 2)
        n_below = int(0.70 * n_bank_samples)
        n_above = int(0.30 * n_bank_samples)
        
        idx_below = rng.choice(below_median.index, size=min(n_below, len(below_median)), replace=False)
        idx_above = rng.choice(above_median.index, size=min(n_above, len(above_median)), replace=False)
        bank_df = pd.concat([below_median.loc[idx_below], above_median.loc[idx_above]]).sample(frac=1.0, random_state=seed).reset_index(drop=True)
        
        out_name = "bank_a_train.json"
    else:
        # Bank B gets 30% below median, 70% above
        n_bank_samples = min(len(above_median) * 2, len(train_pool_df) // 2)
        n_below = int(0.30 * n_bank_samples)
        n_above = int(0.70 * n_bank_samples)
        
        idx_below = rng.choice(below_median.index, size=min(n_below, len(below_median)), replace=False)
        idx_above = rng.choice(above_median.index, size=min(n_above, len(above_median)), replace=False)
        bank_df = pd.concat([below_median.loc[idx_below], above_median.loc[idx_above]]).sample(frac=1.0, random_state=seed).reset_index(drop=True)
        
        out_name = "bank_b_train.json"
        
    out_path = os.path.join(output_dir, out_name)
    bank_df.to_json(out_path, orient="records", indent=2)
    print(f"Saved Bank {bank_upper} training partition ({len(bank_df)} records) to {out_path}")
    
    # Also write bank_A_train.json if uppercase is requested by some scripts
    alt_out_path = os.path.join(output_dir, f"bank_{bank_upper}_train.json")
    if alt_out_path != out_path:
        bank_df.to_json(alt_out_path, orient="records", indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split credit risk dataset for FedCredit banks.")
    parser.add_argument("--bank", type=str, default="A", choices=["A", "B", "a", "b"], help="Bank identifier (A or B)")
    parser.add_argument("--csv", type=str, default="credit_risk_dataset.csv", help="Path to input Kaggle CSV")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default 42)")
    parser.add_argument("--output-dir", type=str, default="./data", help="Output directory")
    args = parser.parse_args()
    
    split_and_partition(args.csv, args.bank, args.seed, args.output_dir)
