import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('api:online'));
    return response;
  },
  (error) => {
    if (!error.response) {
      window.dispatchEvent(new CustomEvent('api:offline'));
      return Promise.reject({
        isNetworkError: true,
        message: 'Cannot reach the server. Check that the backend is running and try again.',
      });
    }

    window.dispatchEvent(new CustomEvent('api:online'));
    if (error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout');
      if (!isAuthCall) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  if (error.isNetworkError) return error.message;
  const data = error.response?.data;
  if (data?.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail.map((err) => `${err.loc?.[1] || ''}: ${err.msg}`).join(', ');
    }
    return data.detail;
  }
  if (data?.message) return data.message;
  return error.message || 'Request failed. Please try again.';
};

export const unwrap = (response) => response.data?.data ?? response.data;

export default api;
