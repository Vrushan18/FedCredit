// customer-portal/src/services/api.js
// Consortium API Service Connector

const HEAD_OFFICE_URL = import.meta.env.VITE_HEAD_OFFICE_URL || "http://127.0.0.1:8000/api/v1";

// Step 1: Create application tracking index at Head Office
export async function createHeadOfficeApplication(bankId, customerToken) {
  const resp = await fetch(`${HEAD_OFFICE_URL}/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${customerToken}`
    },
    body: JSON.stringify({ bank_id: bankId })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to register application at Head Office");
  }
  return await resp.json(); // returns { application_id, status: "SUBMITTED" }
}

// Step 2: Submit full private loan records directly to chosen Bank Node
export async function submitToBankNode(bankBaseUrl, applicationId, customerToken, formData, biometricFile) {
  const data = new FormData();
  data.append("application_id", applicationId);

  // Append all 17 features & demographics
  Object.keys(formData).forEach((key) => {
    data.append(key, formData[key]);
  });

  // Append verified biometric scan
  if (biometricFile) {
    data.append("biometric_file", biometricFile);
  }

  const cleanBase = bankBaseUrl.replace(/\/+$/, '');
  const url = cleanBase.endsWith('/api') ? `${cleanBase}/applications` : `${cleanBase}/api/applications`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${customerToken}`
    },
    body: data
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.detail || err?.error?.message || "Bank rejected application");
  }
  return await resp.json();
}

// Re-export all other consortium and portal client services from api.ts
export * from './api.ts';
