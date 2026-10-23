// customer-portal/src/utils/validation.js
// Complete Form & Identity Cross-Verification Utility

// Verhoeff Algorithm multiplication table
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

// Permutation table
const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

// Verhoeff checksum validator for Indian Aadhaar
export function validateAadhaar(aadhaarStr) {
  if (!/^\d{12}$/.test(aadhaarStr)) return false;
  let c = 0;
  const invertedArray = aadhaarStr.split("").map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = dTable[c][pTable[i % 8][invertedArray[i]]];
  }
  return c === 0;
}

// Master Cross-Verification for All Customer Inputs
export function validateCustomerForm(formData) {
  const errors = {};
  const warnings = {};

  // 1. PAN Card Verification: 10 chars, 4th character MUST be 'P' (Individual)
  const pan = (formData.pan || "").trim().toUpperCase();
  const panRegex = /^[A-Z]{3}P[A-Z]{1}[0-9]{4}[A-Z]{1}$/;
  if (!pan) {
    errors.pan = "PAN Number is required.";
  } else if (!panRegex.test(pan)) {
    errors.pan = "Invalid PAN. Individual retail personal loans require 4th letter to be 'P' (e.g. ABCPE1234F).";
  }

  // 2. Aadhaar Verification: 12-digit Verhoeff Checksum
  const aadhaar = (formData.aadhaar || "").trim();
  if (!aadhaar) {
    errors.aadhaar = "Aadhaar Number is required.";
  } else if (!validateAadhaar(aadhaar)) {
    errors.aadhaar = "Invalid Aadhaar. Number failed official 12-digit Verhoeff mathematical integrity check.";
  }

  // 3. Indian Mobile Number (10 digits starting with 6, 7, 8, 9)
  const phone = (formData.phone || "").trim();
  if (!/^[6-9]\d{9}$/.test(phone)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number starting with 6-9.";
  }

  // 4. Age Verification (Between 18 and 100 as per preprocessing.json)
  const age = Number(formData.age);
  if (isNaN(age) || age < 18 || age > 100) {
    errors.age = "Applicant age must be between 18 and 100 years.";
  }

  // 5. Semantic Cross-Check: Employment Length vs Age
  const empLength = Number(formData.employment_length_years);
  if (isNaN(empLength) || empLength < 0 || empLength > 60) {
    errors.employment_length_years = "Employment length must be between 0 and 60 years.";
  } else if (age && empLength > (age - 18)) {
    errors.employment_length_years = `Impossible employment duration: ${empLength} yrs claimed, but applicant reached working age 18 only ${age - 18} yrs ago.`;
  }

  // 6. Semantic Cross-Check: Credit History Length vs Age
  const creditHist = Number(formData.credit_history_length_years);
  if (isNaN(creditHist) || creditHist < 0 || creditHist > 50) {
    errors.credit_history_length_years = "Credit history length must be between 0 and 50 years.";
  } else if (age && creditHist > (age - 18)) {
    errors.credit_history_length_years = `Impossible credit history: ${creditHist} yrs claimed, but applicant reached legal financial age only ${age - 18} yrs ago.`;
  }

  // 7. Financial Inconsistency: Loan vs Income (DTI Check)
  const income = Number(formData.annual_income);
  const loan = Number(formData.loan_amount);
  if (isNaN(income) || income < 10000) {
    errors.annual_income = "Annual income must be at least ₹10,000.";
  }
  if (isNaN(loan) || loan < 1000) {
    errors.loan_amount = "Loan requested must be at least ₹1,000.";
  }
  if (income > 0 && loan > 0) {
    const dti = loan / income;
    if (dti > 0.85) {
      warnings.loan_amount = `High Risk Warning: Loan amount is ${(dti * 100).toFixed(1)}% of annual income (exceeds recommended 85% safety threshold).`;
    }
  }

  // 8. Strict Frozen Enums Verification
  const validHome = ["RENT", "OWN", "MORTGAGE", "OTHER"];
  if (!validHome.includes(formData.home_ownership)) {
    errors.home_ownership = "Select a valid home ownership option (RENT, OWN, MORTGAGE, OTHER).";
  }

  const validPurpose = ["EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT"];
  if (!validPurpose.includes(formData.loan_purpose)) {
    errors.loan_purpose = "Select a valid standardized loan purpose.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
