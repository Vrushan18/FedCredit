import axios, { AxiosError } from 'axios';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  CustomerAuthUser,
  BankNode,
  CreateApplicationIntentResponse,
  ApplicationSummary,
  ApplicationDetail,
  CustomerNotification,
  LoanApplicationPayload,
  StandardErrorEnvelope,
} from '../types/contracts';

// The single backend URL defined in .env
const HEAD_OFFICE_BASE_URL =
  import.meta.env.VITE_HEAD_OFFICE_URL || 'http://100.127.141.31:8000/api/v1';

export const headOfficeClient = axios.create({
  baseURL: HEAD_OFFICE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to inject Customer JWT token
headOfficeClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fedcredit_customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to extract human-readable error messages from standard error envelopes
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    if (data?.message) {
      return data.message;
    }
    if (data?.error?.code) {
      return `Error (${data.error.code})`;
    }
    if (error.response?.status === 404) {
      const url = error.config?.url || 'endpoint';
      return `Endpoint not found (404) at: ${url}. Verify the target bank server route.`;
    }
    if (error.message === 'Network Error') {
      const url = error.config?.url || HEAD_OFFICE_BASE_URL;
      return `Network connection failed. Verify the node is online at ${url}`;
    }
    return error.message || 'An unexpected server error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred';
}

// ==========================================
// HEAD OFFICE API CALLS (Section 4)
// ==========================================

export async function checkHeadOfficeHealth(): Promise<{ status: string; version?: string }> {
  const response = await headOfficeClient.get('/health');
  return response.data;
}

export async function registerCustomer(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await headOfficeClient.post<RegisterResponse>('/auth/customer/register', data);
  return response.data;
}

export async function loginCustomer(data: LoginRequest): Promise<LoginResponse> {
  const response = await headOfficeClient.post<LoginResponse>('/auth/customer/login', data);
  return response.data;
}

export async function getCustomerProfile(): Promise<CustomerAuthUser> {
  const response = await headOfficeClient.get<CustomerAuthUser>('/auth/me');
  return response.data;
}

export async function getBankNodes(): Promise<BankNode[]> {
  const response = await headOfficeClient.get<BankNode[]>('/banks');
  return response.data;
}

export async function createApplicationIntent(bankId: string): Promise<CreateApplicationIntentResponse> {
  const response = await headOfficeClient.post<CreateApplicationIntentResponse>('/applications', {
    bank_id: bankId,
  });
  return response.data;
}

export async function getMyApplications(): Promise<ApplicationSummary[]> {
  const response = await headOfficeClient.get<ApplicationSummary[]>('/applications/mine');
  return response.data;
}

export async function getApplicationDetails(applicationId: string): Promise<ApplicationDetail> {
  const response = await headOfficeClient.get<ApplicationDetail>(`/applications/${applicationId}`);
  return response.data;
}

export async function getNotifications(): Promise<CustomerNotification[]> {
  const response = await headOfficeClient.get<CustomerNotification[]>('/notifications');
  return response.data;
}

export async function markNotificationAsRead(id: number | string): Promise<{ status: string }> {
  const response = await headOfficeClient.post<{ status: string }>(`/notifications/${id}/read`);
  return response.data;
}

// ==========================================
// BANK NODE INBOUND API CALLS (Section 5)
// ==========================================
// IMPORTANT CONTRACT RULE: Bank URLs are dynamic and retrieved from GET /banks!

export async function submitApplicationToBank(
  bankApiBaseUrl: string,
  payload: LoanApplicationPayload,
  documents: File[],
  fingerprintImage: File
): Promise<{ application_id: string; status: string }> {
  const token = localStorage.getItem('fedcredit_customer_token');
  
  // Format multipart/form-data as per Section 5 of contract:
  // - data: JSON string conforming to section 3.3
  // - documents: 0..n files
  // - fingerprint: 1 image file
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));

  documents.forEach((doc) => {
    formData.append('documents', doc);
  });

  if (fingerprintImage) {
    formData.append('fingerprint', fingerprintImage);
  }

  // Canonical JSON payload for Bank nodes that consume JSON schemas
  const jsonPayload = {
    application_id: payload.application_id,
    customer_id: payload.customer_id,
    full_name: payload.applicant.full_name,
    name: payload.applicant.full_name,
    customer_name: payload.applicant.full_name,
    age: payload.applicant.age,
    gender: payload.applicant.gender,
    address: payload.applicant.address,
    phone: payload.applicant.phone,
    occupation: payload.applicant.occupation,
    employment_type: payload.applicant.employment_type,
    annual_income: payload.financial.annual_income,
    income: payload.financial.annual_income,
    debt: payload.financial.existing_debt,
    existing_debt: payload.financial.existing_debt,
    credit_score: payload.financial.credit_score,
    home_ownership: payload.financial.home_ownership,
    ownership: payload.financial.home_ownership,
    employment_length_years: payload.financial.employment_length_years,
    employment_length: payload.financial.employment_length_years,
    credit_history_length_years: payload.financial.credit_history_length_years,
    previous_default: payload.financial.previous_default ? 1 : 0,
    loan_amount: payload.loan.amount,
    amount: payload.loan.amount,
    loan_purpose: payload.loan.purpose,
    purpose: payload.loan.purpose,
  };

  // Normalize base URL and resolve Tailscale IP if needed
  let cleanBase = bankApiBaseUrl.trim();
  if (cleanBase.includes('100.74.158.82')) {
    cleanBase = cleanBase.replace('100.74.158.82', '100.120.140.95');
  }

  const root = cleanBase.replace(/\/+$/, '');
  const candidateUrls: string[] = [];
  if (root.endsWith('/api')) {
    candidateUrls.push(`${root}/applications`);
  } else {
    candidateUrls.push(`${root}/api/applications`);
    candidateUrls.push(`${root}/applications`);
  }

  let lastError: unknown = null;

  // Try candidate URLs with multipart/form-data first (Contract spec)
  for (const url of candidateUrls) {
    try {
      const response = await axios.post(url, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 20000,
      });
      return response.data;
    } catch (err: any) {
      lastError = err;
      // If server returned 404, try next candidate URL
      if (err.response?.status === 404) {
        continue;
      }
      // If server doesn't support multipart (e.g. Bank B expecting JSON), try JSON payload
      if (err.response?.status === 500 || err.response?.status === 422) {
        try {
          const jsonResponse = await axios.post(url, jsonPayload, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            timeout: 20000,
          });
          return jsonResponse.data;
        } catch (jsonErr: any) {
          lastError = jsonErr;
        }
      }
    }
  }

  // If candidate loop didn't return, also try JSON on all candidates before giving up
  for (const url of candidateUrls) {
    try {
      const jsonResponse = await axios.post(url, jsonPayload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 20000,
      });
      return jsonResponse.data;
    } catch (jsonErr: any) {
      lastError = jsonErr;
    }
  }

  throw lastError || new Error('Failed to submit application to bank node.');
}

// Two-step submission dispatcher according to Section 2.4 of Consortium Handbook
export async function createHeadOfficeApplication(bankId: string, customerToken: string): Promise<{ application_id: string; status: string }> {
  const resp = await fetch(`${HEAD_OFFICE_BASE_URL}/applications`, {
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
  return await resp.json();
}

export async function submitToBankNode(
  bankBaseUrl: string,
  applicationId: string,
  customerToken: string,
  formData: Record<string, any>,
  biometricFile?: File | null
): Promise<any> {
  const data = new FormData();
  data.append("application_id", applicationId);

  Object.keys(formData).forEach((key) => {
    data.append(key, formData[key]);
  });

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

export { HEAD_OFFICE_BASE_URL };
