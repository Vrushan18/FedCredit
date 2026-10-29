import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bank_b_employee_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for Error Envelope normalization
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.error) {
      const { code, message } = error.response.data.error;
      const customError = new Error(message || 'An error occurred.');
      customError.code = code;
      customError.details = error.response.data.error.details || {};
      return Promise.reject(customError);
    }
    return Promise.reject(error);
  }
);

export default api;
