import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE, endpoints } from '@/lib/api/endpoints';
import { parseApiError } from '@/lib/api/errors';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

export function unwrapApiData<T>(value: unknown): T {
  if (isApiEnvelope<T>(value)) {
    return value.data;
  }
  return value as T;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${API_BASE}${endpoints.auth.refresh}`,
      {},
      { withCredentials: true, timeout: 30_000 },
    );
    const data = unwrapApiData<{ accessToken: string }>(res.data);
    const newToken = data.accessToken;
    if (typeof newToken !== 'string' || newToken.trim() === '') {
      setAccessToken(null);
      return null;
    }
    setAccessToken(newToken);
    return newToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original) {
      return Promise.reject(parseApiError(error));
    }

    const requestUrl = original?.url ?? '';
    const skipRefreshPaths: ReadonlySet<string> = new Set([
      endpoints.auth.login,
      endpoints.auth.refresh,
      endpoints.auth.logout,
      endpoints.auth.studentSignup,
      endpoints.auth.companySignupDocumentUploadUrl,
      endpoints.auth.companySignup,
      endpoints.auth.verifyOtp,
      endpoints.auth.resendOtp,
      endpoints.auth.mfaSetupStart,
      endpoints.auth.mfaSetupComplete,
      endpoints.auth.mfaVerify,
      endpoints.auth.forgotPassword,
      endpoints.auth.resetPassword,
    ]);
    let pathname = requestUrl;
    try { pathname = new URL(requestUrl, window.location.origin).pathname; } catch { /* keep as-is */ }
    const shouldSkipRefresh = skipRefreshPaths.has(pathname);

    if (error.response?.status === 401 && !original._retry && !shouldSkipRefresh) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(original);
      }

      window.location.href = '/login';
      return Promise.reject(parseApiError(error));
    }

    return Promise.reject(parseApiError(error));
  },
);
