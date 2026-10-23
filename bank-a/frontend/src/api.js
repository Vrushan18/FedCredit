/**
 * Bank A API Service Client
 * Connects to Bank A FastAPI Backend on port 8001
 */

const API_BASE_URL = import.meta.env.VITE_BANK_API_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('bank_a_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.detail?.message || data?.detail || 'Request failed';
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await handleResponse(res);
    if (data.access_token) {
      localStorage.setItem('bank_a_token', data.access_token);
      localStorage.setItem('bank_a_user', JSON.stringify(data.employee));
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  logout() {
    localStorage.removeItem('bank_a_token');
    localStorage.removeItem('bank_a_user');
  },

  // Health & Stats
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  async getStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Loan Applications
  async getApplications(status = '', search = '') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE_URL}/loan-applications?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getApplicationDetail(id) {
    const res = await fetch(`${API_BASE_URL}/loan-applications/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async predictApplication(id) {
    const res = await fetch(`${API_BASE_URL}/loan-applications/${id}/predict`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async submitDecision(id, decision, note = '') {
    const res = await fetch(`${API_BASE_URL}/loan-applications/${id}/decision`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ decision, note })
    });
    return handleResponse(res);
  },

  async flagApplication(id, reason) {
    const res = await fetch(`${API_BASE_URL}/loan-applications/${id}/flag`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Customers
  async getCustomers(search = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createCustomer(custData) {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(custData)
    });
    return handleResponse(res);
  },

  async getCustomerDetail(id) {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Training & Logs
  async triggerLocalTraining() {
    const res = await fetch(`${API_BASE_URL}/training/local/start`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getTrainingLogs() {
    const res = await fetch(`${API_BASE_URL}/training/logs`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
