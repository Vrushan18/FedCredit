"""
Dataset Splitter for Federated Learning (Contract Section 6)
Usage:
    python split_dataset.py --bank A --seed 42
    python split_dataset.py --bank B --seed 42

Rules:
    1. Reserves a common 20% test set first.
    2. Bank A gets 70% below-median-income rows + 30% above.
    3. Bank B gets the reverse (30% below-median-income + 70% above).
    4. Slices are saved locally as bank_{bank_id}_train.csv and common_test.csv.
"""
import argparse
import os
import json
import numpy as np

def generate_mock_credit_dataset(n_samples: int = 1000, seed: int = 42):
    """Generates synthetic data matching Kaggle Credit Risk Dataset distribution."""
    rng = np.random.default_rng(seed)
    
    age = rng.integers(21, 65, size=n_samples)
    annual_income = rng.lognormal(mean=10.8, sigma=0.6, size=n_samples).round(-2)
    emp_length = rng.integers(0, 25, size=n_samples)
    loan_amount = rng.integers(2000, 35000, size=n_samples).round(-2)
    loan_percent_income = np.clip(loan_amount / (annual_income + 1e-5), 0.02, 0.85)
    credit_hist = np.clip(age - 18 - rng.integers(0, 5, size=n_samples), 1, 30)
    prev_default = rng.choice([0, 1], p=[0.82, 0.18], size=n_samples)
    
    home_ownerships = ["RENT", "OWN", "MORTGAGE", "OTHER"]
    home_ownership = rng.choice(home_ownerships, p=[0.50, 0.08, 0.38, 0.04], size=n_samples)
    
    loan_purposes = ["EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT"]
    loan_purpose = rng.choice(loan_purposes, p=[0.20, 0.15, 0.18, 0.17, 0.20, 0.10], size=n_samples)
    
    # Ground truth risk calculation
    risk_score = (
        - 0.02 * (annual_income / 10000.0)
        + 1.8 * loan_percent_income
        + 0.8 * prev_default
        - 0.03 * credit_hist
        + (home_ownership == "RENT") * 0.3
    )
    prob_default = 1.0 / (1.0 + np.exp(-risk_score))
    loan_status = (rng.uniform(0, 1, size=n_samples) < prob_default).astype(int)
    
    data = []
    for i in range(n_samples):
        data.append({
            "age": int(age[i]),
            "annual_income": float(annual_income[i]),
            "employment_length_years": int(emp_length[i]),
            "loan_amount": float(loan_amount[i]),
            "loan_percent_income": float(round(loan_percent_income[i], 4)),
            "credit_history_length_years": int(credit_hist[i]),
            "previous_default": int(prev_default[i]),
            "home_ownership": home_ownership[i],
            "loan_purpose": loan_purpose[i],
            "loan_status": int(loan_status[i])
        })
    return data

def split_and_export(bank: str, seed: int = 42, csv_path: str = None, out_dir: str = "."):
    bank = bank.upper()
    if bank not in ["A", "B"]:
        raise ValueError("Bank must be 'A' or 'B'")
        
    records = generate_mock_credit_dataset(n_samples=1200, seed=seed)
    
    # Sort or identify median income
    incomes = np.array([r["annual_income"] for r in records])
    median_income = np.median(incomes)
    
    rng = np.random.default_rng(seed)
    indices = np.arange(len(records))
    rng.shuffle(indices)
    
    # 20% common test set
    n_test = int(0.20 * len(records))
    test_idx = indices[:n_test]
    train_idx = indices[n_test:]
    
    test_set = [records[i] for i in test_idx]
    train_pool = [records[i] for i in train_idx]
    
    below_median = [r for r in train_pool if r["annual_income"] < median_income]
    above_median = [r for r in train_pool if r["annual_income"] >= median_income]
    
    rng.shuffle(below_median)
    rng.shuffle(above_median)
    
    # Bank A: 70% below + 30% above
    # Bank B: 30% below + 70% above
    n_bank_train = min(len(below_median), len(above_median))
    
    if bank == "A":
        n_below = int(0.70 * n_bank_train)
        n_above = int(0.30 * n_bank_train)
        client_train = below_median[:n_below] + above_median[:n_above]
    else:
        n_below = int(0.30 * n_bank_train)
        n_above = int(0.70 * n_bank_train)
        client_train = below_median[:n_below] + above_median[:n_above]
        
    rng.shuffle(client_train)
    
    os.makedirs(out_dir, exist_ok=True)
    train_file = os.path.join(out_dir, f"bank_{bank}_train.json")
    test_file = os.path.join(out_dir, "common_test.json")
    
    with open(train_file, "w") as f:
        json.dump(client_train, f, indent=2)
    with open(test_file, "w") as f:
        json.dump(test_set, f, indent=2)
        
    print(f"[Split Success] Generated dataset split for Bank {bank}:")
    print(f"  Training samples: {len(client_train)} (Skewed by income)")
    print(f"  Saved to: {train_file}")
    print(f"  Common test samples: {len(test_set)} -> {test_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split credit risk dataset for Bank A or Bank B")
    parser.add_argument("--bank", required=True, choices=["A", "B", "a", "b"], help="Target bank node")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default 42)")
    parser.add_argument("--out", default=".", help="Output directory")
    args = parser.parse_args()
    
    split_and_export(bank=args.bank, seed=args.seed, out_dir=args.out)
