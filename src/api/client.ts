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

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

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
      url.includes('/auth/logout') ||
      url.includes('/auth/webauthn/');

    if (isAuthEndpoint) {
      useAuthStore.getState().clearAuth();
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
       // Prevent infinite loops if retry also fails
       useAuthStore.getState().clearAuth();
       if (!redirectingToLogin && window.location.pathname !== '/login') {
         redirectingToLogin = true;
         window.location.replace('/login');
       }
       return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResp = await rawApi.post('/auth/refresh');
      const { access_token, user } = refreshResp.data.data;
      
      if (!access_token) {
        throw new Error('No access token received');
      }

      useAuthStore.getState().setAuth(access_token, user);
      
      // Process queue
      processQueue(null, access_token);
      
      // Retry original
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    } catch (e) {
      processQueue(e, null);
      useAuthStore.getState().clearAuth();
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        window.location.replace('/login');
      }
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

