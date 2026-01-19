import axios from 'axios';
import { useAuthStore } from '../stores/auth';

let redirectingToLogin = false;

const baseConfig = {
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
} as const;

export const api = axios.create({
  ...baseConfig,
});

const rawApi = axios.create({
  ...baseConfig,
});

// Request interceptor to add auth token from memory
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const url: string = originalRequest.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout');

    if (isAuthEndpoint || originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResp = await rawApi.post('/auth/refresh');
      const { access_token, user } = refreshResp.data.data;
      useAuthStore.getState().setAuth(access_token, user);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    } catch (e) {
      useAuthStore.getState().clearAuth();
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        window.location.replace('/login');
      }
      return Promise.reject(e);
    }
  }
);

