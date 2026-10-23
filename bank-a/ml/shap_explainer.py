"""
Explainable AI (SHAP) Engine for Bank A
Conforms strictly to FedCredit Team Contract Section 5, 6 & 8:
- Uses LinearExplainer / analytical SHAP values for linear model
- Computes top 5 factors by absolute impact
- Returns direction: POSITIVE (helps applicant) or NEGATIVE (hurts applicant)
- Maps to plain-English labels
"""

import numpy as np
from typing import List, Dict, Any
from ml.model import CreditRiskModel

class ShapExplainer:
    def __init__(self, model: CreditRiskModel):
        self.model = model
        self.feature_order = model.feature_order

    def explain(self, X: np.ndarray, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Computes SHAP contributions for a single 1x17 feature vector.
        X has shape (1, 17) and contains standardized/encoded values.
        Returns top 5 factors sorted by absolute impact.
        """
        weights = self.model.model.coef_.flatten() # shape (17,)
        features_vec = X.flatten() # shape (17,)
        
        # In linear models, SHAP values are: phi_i = w_i * (x_i - baseline_i)
        # Background expectation of standardized features is 0.0
        shap_values = weights * features_vec
        
        explanations = []
        for i, feat_name in enumerate(self.feature_order):
            val = shap_values[i]
            # In default prediction, negative logit contribution lowers default risk -> helps applicant
            # Positive logit contribution increases default risk -> hurts applicant
            if val < 0:
                direction = "POSITIVE"
            else:
                direction = "NEGATIVE"
                
            label = self._generate_label(feat_name, features_vec[i], direction, raw_data)
            explanations.append({
                "feature": feat_name,
                "label": label,
                "impact": round(float(val), 2),
                "direction": direction,
                "abs_impact": abs(float(val))
            })
            
        # Sort by absolute impact descending and select top 5
        explanations.sort(key=lambda x: x["abs_impact"], reverse=True)
        top_5 = []
        for item in explanations[:5]:
            top_5.append({
                "feature": item["feature"],
                "label": item["label"],
                "impact": item["impact"],
                "direction": item["direction"]
            })
            
        return top_5

    def _generate_label(self, feature: str, norm_val: float, direction: str, raw_data: Dict[str, Any]) -> str:
        applicant = raw_data.get("applicant", {})
        financial = raw_data.get("financial", {})
        loan = raw_data.get("loan", {})
        
        if feature == "annual_income":
            inc = financial.get("annual_income", 0)
            return "High annual income" if direction == "POSITIVE" else "Lower income tier"
        elif feature == "loan_percent_income":
            return "Low debt burden relative to income" if direction == "POSITIVE" else "Loan is a large share of income"
        elif feature == "loan_amount":
            return "Moderate requested loan size" if direction == "POSITIVE" else "Substantial loan principal amount"
        elif feature == "previous_default":
            return "No previous default on record" if direction == "POSITIVE" else "Prior credit default detected"
        elif feature == "employment_length_years":
            return "Strong employment stability" if direction == "POSITIVE" else "Short employment tenure"
        elif feature == "credit_history_length_years":
            return "Established credit history" if direction == "POSITIVE" else "Brief credit history length"
        elif feature == "age":
            return "Mature borrower profile" if direction == "POSITIVE" else "Younger demographic bracket"
        elif feature == "home_ownership_RENT":
            return "Tenant residential profile"
        elif feature == "home_ownership_OWN":
            return "Home owner (asset-backed stability)"
        elif feature == "home_ownership_MORTGAGE":
            return "Mortgage loan commitment"
        elif feature == "loan_purpose_DEBT_CONSOLIDATION":
            return "Debt consolidation intent"
        elif feature == "loan_purpose_EDUCATION":
            return "Educational advancement loan"
        elif feature == "loan_purpose_VENTURE":
            return "Business venture financing"
        elif feature == "loan_purpose_MEDICAL":
            return "Medical emergency financing"
        elif feature == "loan_purpose_PERSONAL":
            return "Personal loan purpose"
        elif feature == "loan_purpose_HOME_IMPROVEMENT":
            return "Home renovation investment"
        else:
            return feature.replace("_", " ").title()
