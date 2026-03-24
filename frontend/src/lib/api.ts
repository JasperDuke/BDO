import axios from 'axios';
import { clearToken, getToken } from './auth-storage';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData: do not send application/json — browser/axios must set multipart + boundary
  // or multer receives no file fields ("No files provided").
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export function attachAdminSecret(config: Parameters<typeof api.request>[0], secret: string) {
  const headers = { ...(config.headers || {}), 'x-admin-secret': secret };
  return { ...config, headers };
}

let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url || '');
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearToken();
      onAuthFailure?.();
    }
    return Promise.reject(err);
  }
);
