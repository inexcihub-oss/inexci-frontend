import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { logger, setRequestId } from "./logger";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth-token";
import { clearSessionFlag } from "./session-flag";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3002";
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
  // Evita requisições penduradas indefinidamente segurando a UI.
  timeout: 30000,
});

if (process.env.NODE_ENV === "production" && !api.defaults.baseURL) {
  logger.warn(
    "[api] NEXT_PUBLIC_API_URL não configurada em produção; usando requisições relativas ao domínio atual.",
  );
}

/**
 * `take` explícito para telas que carregam a lista inteira (dropdowns de
 * referência: hospitais, convênios, fornecedores, procedimentos, fabricantes).
 * O backend passou a aplicar defaults de paginação (take=10), então listas que
 * precisam de todos os registros devem pedir uma página ampla explicitamente.
 */
export const FETCH_ALL_TAKE = 1000;

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

/**
 * O refresh falhou porque a sessão acabou — ou só porque não deu agora?
 *
 * 400/401/403 vêm do próprio `/auth/refresh` quando o cookie não existe mais,
 * expirou ou teve a família revogada: aí a sessão morreu de fato e o certo é
 * mandar para o login. Qualquer outra coisa — 429 do throttler, 5xx, queda de
 * rede, requisição abortada por navegação — é transitória, e tratá-la como
 * sessão inválida expulsava o usuário com o refresh token ainda válido no
 * cookie. `/auth/refresh` é chamado a cada carregamento de página; quem navega
 * rápido (ou tem várias abas) estoura o limite de 10/min e caía na tela de
 * login sem ter feito nada de errado.
 */
export function isSessaoExpirada(erro: unknown): boolean {
  const status = (erro as AxiosError | undefined)?.response?.status;
  return status === 400 || status === 401 || status === 403;
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
        // Só derruba a sessão quando ela realmente acabou: um 429 do throttler
        // ou uma falha de rede não invalidam o cookie de refresh.
        if (isSessaoExpirada(refreshError)) forceLogout();
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
