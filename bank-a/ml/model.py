"""
Bank A Credit Risk ML Model Engine
Conforms strictly to FedCredit Team Contract Section 6 & 8:
- 17 features in frozen order
- Standardized scaling & clip limits loaded from preprocessing.json
- Scikit-learn LogisticRegression with classes_ = [0, 1]
- Federated weights shape: coef_ (1, 17), intercept_ (1,)
"""

import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score, log_loss

logger = logging.getLogger("bank_a.ml")

class CreditRiskModel:
    def __init__(self, preprocessing_path: Optional[str] = None):
        if preprocessing_path is None:
            # Look in current folder or parent
            candidates = [
                os.path.join(os.path.dirname(__file__), "..", "preprocessing.json"),
                os.path.join(os.path.dirname(__file__), "preprocessing.json"),
                "preprocessing.json"
            ]
            for c in candidates:
                if os.path.exists(c):
                    preprocessing_path = c
                    break
        
        self.preprocessing_path = preprocessing_path
        self.meta = self._load_preprocessing_meta()
        self.feature_order = self.meta["feature_order"]
        self.fx_rate = float(self.meta.get("dataset_fx_rate", 1.0))
        
        # Initialize Logistic Regression
        self.model = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
        self.model.classes_ = np.array([0, 1])
        self.model.coef_ = np.zeros((1, 17), dtype=np.float64)
        self.model.intercept_ = np.zeros((1,), dtype=np.float64)
        self.model_version = "v1-local"
        self._is_fitted = False

    def _load_preprocessing_meta(self) -> Dict[str, Any]:
        if self.preprocessing_path and os.path.exists(self.preprocessing_path):
            with open(self.preprocessing_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise FileNotFoundError(f"preprocessing.json not found at {self.preprocessing_path}")

    def transform_single(self, applicant: Dict[str, Any], financial: Dict[str, Any], loan: Dict[str, Any]) -> np.ndarray:
        """Transforms a canonical application payload into the frozen 17-feature vector."""
        # 1. Numeric features
        age = float(applicant.get("age", self.meta["imputation_medians"]["age"]))
        annual_income = float(financial.get("annual_income", self.meta["imputation_medians"]["annual_income"]))
        emp_length = float(financial.get("employment_length_years", self.meta["imputation_medians"]["employment_length_years"]))
        loan_amount = float(loan.get("amount", self.meta["imputation_medians"]["loan_amount"]))
        
        # Loan percent income calculation
        if annual_income > 0:
            loan_percent_income = loan_amount / annual_income
        else:
            loan_percent_income = float(self.meta["imputation_medians"]["loan_percent_income"])
            
        credit_hist_length = float(financial.get("credit_history_length_years", self.meta["imputation_medians"]["credit_history_length_years"]))
        
        # Clip limits
        clip = self.meta["clip_limits"]
        age = np.clip(age, clip["age"]["min"], clip["age"]["max"])
        emp_length = np.clip(emp_length, clip["employment_length_years"]["min"], clip["employment_length_years"]["max"])
        loan_percent_income = np.clip(loan_percent_income, clip["loan_percent_income"]["min"], clip["loan_percent_income"]["max"])
        
        # Standardize numeric features using FROZEN shared mean/std
        mean = self.meta["standardization"]["mean"]
        std = self.meta["standardization"]["std"]
        
        norm_age = (age - mean["age"]) / std["age"]
        norm_income = (annual_income - mean["annual_income"]) / std["annual_income"]
        norm_emp = (emp_length - mean["employment_length_years"]) / std["employment_length_years"]
        norm_loan = (loan_amount - mean["loan_amount"]) / std["loan_amount"]
        norm_pct = (loan_percent_income - mean["loan_percent_income"]) / std["loan_percent_income"]
        norm_cred_hist = (credit_hist_length - mean["credit_history_length_years"]) / std["credit_history_length_years"]
        
        # 2. Binary: previous_default
        prev_def = financial.get("previous_default", 0)
        if isinstance(prev_def, bool):
            prev_def = 1 if prev_def else 0
        else:
            prev_def = int(prev_def)
            
        # 3. One-hot home ownership: RENT, OWN, MORTGAGE, OTHER
        home_own = str(financial.get("home_ownership", "RENT")).upper().strip()
        ho_rent = 1.0 if home_own == "RENT" else 0.0
        ho_own = 1.0 if home_own == "OWN" else 0.0
        ho_mortgage = 1.0 if home_own == "MORTGAGE" else 0.0
        ho_other = 1.0 if home_own not in ["RENT", "OWN", "MORTGAGE"] else 0.0
        
        # 4. One-hot loan purpose: EDUCATION, MEDICAL, VENTURE, PERSONAL, DEBT_CONSOLIDATION, HOME_IMPROVEMENT
        purpose = str(loan.get("purpose", "PERSONAL")).upper().strip()
        lp_edu = 1.0 if purpose == "EDUCATION" else 0.0
        lp_med = 1.0 if purpose == "MEDICAL" else 0.0
        lp_ven = 1.0 if purpose == "VENTURE" else 0.0
        lp_per = 1.0 if purpose == "PERSONAL" else 0.0
        lp_debt = 1.0 if purpose == "DEBT_CONSOLIDATION" else 0.0
        lp_home = 1.0 if purpose == "HOME_IMPROVEMENT" else 0.0
        
        vec = np.array([
            norm_age,
            norm_income,
            norm_emp,
            norm_loan,
            norm_pct,
            norm_cred_hist,
            float(prev_def),
            ho_rent,
            ho_own,
            ho_mortgage,
            ho_other,
            lp_edu,
            lp_med,
            lp_ven,
            lp_per,
            lp_debt,
            lp_home
        ], dtype=np.float64)
        
        return vec.reshape(1, -1)

    def transform_dataframe(self, df: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Transforms a pandas DataFrame into X (N, 17) and y (N,) if loan_status present."""
        mean = self.meta["standardization"]["mean"]
        std = self.meta["standardization"]["std"]
        clip = self.meta["clip_limits"]
        
        age = df["age"].clip(clip["age"]["min"], clip["age"]["max"])
        emp = df["employment_length_years"].clip(clip["employment_length_years"]["min"], clip["employment_length_years"]["max"])
        
        if "loan_percent_income" in df.columns:
            pct = df["loan_percent_income"]
        else:
            pct = df["loan_amount"] / df["annual_income"]
        pct = pct.clip(clip["loan_percent_income"]["min"], clip["loan_percent_income"]["max"])
        
        norm_age = (age - mean["age"]) / std["age"]
        norm_income = (df["annual_income"] - mean["annual_income"]) / std["annual_income"]
        norm_emp = (emp - mean["employment_length_years"]) / std["employment_length_years"]
        norm_loan = (df["loan_amount"] - mean["loan_amount"]) / std["loan_amount"]
        norm_pct = (pct - mean["loan_percent_income"]) / std["loan_percent_income"]
        norm_cred_hist = (df["credit_history_length_years"] - mean["credit_history_length_years"]) / std["credit_history_length_years"]
        
        prev_def = df["previous_default"].astype(float)
        
        ho = df["home_ownership"].str.upper()
        ho_rent = (ho == "RENT").astype(float)
        ho_own = (ho == "OWN").astype(float)
        ho_mortgage = (ho == "MORTGAGE").astype(float)
        ho_other = (~ho.isin(["RENT", "OWN", "MORTGAGE"])).astype(float)
        
        lp = df["loan_purpose"].str.upper()
        lp_edu = (lp == "EDUCATION").astype(float)
        lp_med = (lp == "MEDICAL").astype(float)
        lp_ven = (lp == "VENTURE").astype(float)
        lp_per = (lp == "PERSONAL").astype(float)
        lp_debt = (lp == "DEBT_CONSOLIDATION").astype(float)
        lp_home = (lp == "HOME_IMPROVEMENT").astype(float)
        
        X = np.column_stack([
            norm_age, norm_income, norm_emp, norm_loan, norm_pct, norm_cred_hist,
            prev_def,
            ho_rent, ho_own, ho_mortgage, ho_other,
            lp_edu, lp_med, lp_ven, lp_per, lp_debt, lp_home
        ]).astype(np.float64)
        
        y = None
        if "loan_status" in df.columns:
            y = df["loan_status"].astype(int).values
            
        return X, y

    def predict_default_prob(self, X: np.ndarray) -> float:
        """Computes default probability p in [0, 1]."""
        # Linear logistic computation: p = 1 / (1 + exp(-(X @ coef.T + intercept)))
        z = np.dot(X, self.model.coef_.T) + self.model.intercept_
        p = 1.0 / (1.0 + np.exp(-z))
        return float(np.clip(p[0][0], 0.0001, 0.9999))

    def train_local(self, data_path: str) -> Dict[str, Any]:
        """Trains logistic regression model on Bank A's local partition."""
        with open(data_path, "r", encoding="utf-8") as f:
            records = json.load(f)
        df = pd.DataFrame(records)
        X, y = self.transform_dataframe(df)
        
        self.model.fit(X, y)
        self._is_fitted = True
        self.model_version = "v1-local"
        
        # Evaluate on local training set
        preds = self.model.predict(X)
        probs = self.model.predict_proba(X)[:, 1]
        acc = float(accuracy_score(y, preds))
        auc = float(roc_auc_score(y, probs))
        loss = float(log_loss(y, probs))
        
        logger.info(f"Bank A local training completed: Acc={acc:.4f}, AUC={auc:.4f}, Loss={loss:.4f}, N={len(df)}")
        return {
            "samples": len(df),
            "accuracy": acc,
            "auc": auc,
            "loss": loss,
            "coef": self.model.coef_.tolist(),
            "intercept": self.model.intercept_.tolist()
        }

    def evaluate_test(self, test_path: str) -> Dict[str, float]:
        """Evaluates current weights on test set."""
        with open(test_path, "r", encoding="utf-8") as f:
            records = json.load(f)
        df = pd.DataFrame(records)
        X, y = self.transform_dataframe(df)
        
        probs = self.predict_proba_batch(X)
        preds = (probs >= 0.5).astype(int)
        acc = float(accuracy_score(y, preds))
        auc = float(roc_auc_score(y, probs))
        loss = float(log_loss(y, probs))
        return {"accuracy": acc, "auc": auc, "loss": loss, "samples": len(df)}

    def predict_proba_batch(self, X: np.ndarray) -> np.ndarray:
        z = np.dot(X, self.model.coef_.T) + self.model.intercept_
        return (1.0 / (1.0 + np.exp(-z))).flatten()

    def get_parameters(self) -> List[np.ndarray]:
        """Returns Flower parameters as NumPy arrays: [coef_, intercept_]."""
        return [self.model.coef_.copy(), self.model.intercept_.copy()]

    def set_parameters(self, parameters: List[np.ndarray], version: str = "global"):
        """Sets parameters received from Federated server."""
        self.model.coef_ = np.array(parameters[0], dtype=np.float64).reshape(1, 17)
        self.model.intercept_ = np.array(parameters[1], dtype=np.float64).reshape(1,)
        self.model_version = version
        self._is_fitted = True

    def save_weights(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        data = {
            "model_version": self.model_version,
            "coef": self.model.coef_.tolist(),
            "intercept": self.model.intercept_.tolist(),
            "features": self.feature_order
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def load_weights(self, filepath: str):
        if not os.path.exists(filepath):
            return False
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.model.coef_ = np.array(data["coef"], dtype=np.float64).reshape(1, 17)
        self.model.intercept_ = np.array(data["intercept"], dtype=np.float64).reshape(1,)
        self.model_version = data.get("model_version", "loaded")
        self._is_fitted = True
        return True
