import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle status codes
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      // Network error or backend server not running
      console.warn('Network Error / Backend server unreachable at:', API_BASE_URL);
      return Promise.reject({
        isNetworkError: true,
        message: 'Unable to connect to the backend server. Please verify FastAPI is running at http://localhost:8000.',
      });
    }

    const { status, data } = error.response;

    if (status === 401) {
      // Unauthorized: Clear token and session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/logout') || requestUrl.includes('/auth/login');
      if (!isAuthEndpoint) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    } else if (status === 403) {
      console.error('Forbidden: Insufficient privileges');
    } else if (status === 422) {
      console.error('Validation Error:', data?.detail || data);
    } else if (status >= 500) {
      console.error('Internal Server Error:', data?.message || 'Server encountered an error');
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  if (error.isNetworkError) return error.message;
  if (error.response?.data?.detail) {
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail.map((err) => `${err.loc?.[1] || ''}: ${err.msg}`).join(', ');
    }
    return error.response.data.detail;
  }
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return 'Request failed. Please try again.';
};

export default api;
