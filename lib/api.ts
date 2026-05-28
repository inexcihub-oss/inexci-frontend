import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { logger, setRequestId } from "./logger";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth-token";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // Em produção, nunca usar localhost como fallback para evitar vazamento
  // acidental de token para serviços locais do usuário.
  return "";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    // Pula a página de aviso do ngrok-free quando a API é exposta via túnel
    "ngrok-skip-browser-warning": "true",
  },
  withCredentials: true,
});

if (process.env.NODE_ENV === "production" && !api.defaults.baseURL) {
  logger.warn(
    "[api] NEXT_PUBLIC_API_URL não configurada em produção; usando requisições relativas ao domínio atual.",
  );
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Estado do refresh ────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
}

function forceLogout() {
  if (typeof window !== "undefined") {
    clearAccessToken();
    localStorage.removeItem("user");
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }
}

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers["X-Request-Id"]) {
      config.headers["X-Request-Id"] = generateRequestId();
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — refresh automático ao receber 401 ─────────────────
api.interceptors.response.use(
  (response) => {
    const requestId = (response.headers["x-request-id"] ||
      response.headers["X-Request-Id"]) as string | undefined;
    if (requestId) setRequestId(requestId);
    return response;
  },
  async (error: AxiosError) => {
    const responseRequestId = error.response?.headers?.["x-request-id"] as
      | string
      | undefined;
    if (responseRequestId) setRequestId(responseRequestId);
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Não tentar refresh em rotas de auth (evita loop infinito)
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute
    ) {
      // Se já está fazendo refresh, enfileirar esta request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token é enviado automaticamente via cookie httpOnly
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { "ngrok-skip-browser-warning": "true" },
          },
        );

        const newToken = data.access_token;

        setAccessToken(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response && error.response.status >= 500) {
      logger.error(
        `[api] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response.status}`,
        error,
      );
    }

    return Promise.reject(error);
  },
);

export default api;
