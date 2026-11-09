import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { REFRESH_CORRIDA_ESPERA_MS, resolveApiBaseUrl } from "./api";
import { ADMIN_LOGIN_PATH } from "./admin-nav";

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  mfaEnabled: boolean;
}

export interface AdminSession {
  accessToken: string;
  admin: AdminProfile;
}

const ADMIN_AUTH_PUBLIC_ROUTES = [
  "/admin/auth/login",
  "/admin/auth/mfa/setup",
  "/admin/auth/mfa/enable",
  "/admin/auth/refresh",
  "/admin/auth/logout",
  "/admin/auth/accept-invite",
];

let accessToken: string | null = null;
let refreshPromise: Promise<AdminSession> | null = null;
const expiredListeners = new Set<() => void>();

export function getAdminAccessToken(): string | null {
  return accessToken;
}

export function setAdminAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAdminAccessToken(): void {
  accessToken = null;
}

export function onAdminSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const adminApi = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  withCredentials: true,
  timeout: 30000,
});

function postAdminRefresh(): Promise<AdminSession> {
  return axios
    .post<AdminSession>(
      `${adminApi.defaults.baseURL ?? ""}/admin/auth/refresh`,
      undefined,
      {
        withCredentials: true,
        headers: { "ngrok-skip-browser-warning": "true" },
      },
    )
    .then(({ data }) => {
      setAdminAccessToken(data.accessToken);
      return data;
    });
}

export function refreshAdminSession(): Promise<AdminSession> {
  if (!refreshPromise) {
    refreshPromise = postAdminRefresh()
      .catch(async (error: unknown) => {
        if ((error as AxiosError | undefined)?.response?.status !== 409) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, REFRESH_CORRIDA_ESPERA_MS),
        );
        return postAdminRefresh();
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function isAdminSessionExpiredError(error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

function expireAdminSession(): void {
  clearAdminAccessToken();
  if (expiredListeners.size > 0) {
    expiredListeners.forEach((listener) => listener());
    return;
  }
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith(ADMIN_LOGIN_PATH)
  ) {
    window.location.assign(ADMIN_LOGIN_PATH);
  }
}

function isPublicAuthRoute(url: string | undefined): boolean {
  if (!url) return false;
  return ADMIN_AUTH_PUBLIC_ROUTES.some((route) => url.includes(route));
}

adminApi.interceptors.request.use((config) => {
  const token = getAdminAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["X-Request-Id"]) {
    config.headers["X-Request-Id"] = generateRequestId();
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isPublicAuthRoute(original.url)
    ) {
      original._retry = true;
      try {
        const session = await refreshAdminSession();
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return adminApi(original);
      } catch (refreshError) {
        if (isAdminSessionExpiredError(refreshError)) expireAdminSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default adminApi;
