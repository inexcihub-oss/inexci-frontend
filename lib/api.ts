import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { logger, setRequestId } from "./logger";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth-token";
import { clearSessionFlag } from "./session-flag";

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

// ── Estado do refresh (single-flight compartilhado) ──────────────────────────
// Um único refresh em voo por vez. Tanto o interceptor de 401 quanto o refresh
// proativo do AuthContext reaproveitam esta mesma promise, evitando a corrida
// que rotacionava o mesmo refresh token em paralelo e derrubava a sessão.
let refreshPromise: Promise<string> | null = null;

/**
 * Renova o access token usando o cookie httpOnly de refresh. Single-flight:
 * chamadas concorrentes aguardam a mesma requisição. Retorna o novo access
 * token (e o grava em memória). Lança se o refresh falhar.
 */
export function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { "ngrok-skip-browser-warning": "true" },
        },
      )
      .then(({ data }) => {
        const token = data.access_token as string;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/cadastro",
  "/forgot-password",
  "/confirmar-email",
  "/primeiro-acesso",
];

function forceLogout() {
  if (typeof window !== "undefined") {
    clearAccessToken();
    clearSessionFlag();
    localStorage.removeItem("user");
    const isPublicPath = PUBLIC_AUTH_PATHS.some((p) =>
      window.location.pathname.startsWith(p),
    );
    if (!isPublicPath) {
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
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;

      try {
        // Refresh token é enviado automaticamente via cookie httpOnly.
        // `refreshSession` é single-flight: requests 401 concorrentes aguardam
        // a mesma renovação em vez de disparar refreshes paralelos.
        const newToken = await refreshSession();

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        forceLogout();
        return Promise.reject(refreshError);
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
