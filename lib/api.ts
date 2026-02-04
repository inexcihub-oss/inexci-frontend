import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const tokenTimestamp = localStorage.getItem("token_timestamp");

      if (token) {
        // Verifica se o token tem mais de 24 horas (expiração de segurança do lado do cliente)
        if (tokenTimestamp) {
          const tokenAge = Date.now() - parseInt(tokenTimestamp, 10);
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (tokenAge > twentyFourHours) {
            // Token expirado no lado do cliente
            console.error("❌ Token expirado!");
            localStorage.removeItem("token");
            localStorage.removeItem("token_timestamp");
            localStorage.removeItem("user");
            window.location.href = "/login";
            return Promise.reject(new Error("Token expired"));
          }
        }

        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Verifica se é um erro de token inválido/expirado
      const errorMessage = error.response?.data?.message?.toLowerCase() || "";
      const isTokenError =
        errorMessage.includes("token") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("jwt") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid");

      // Só faz logout se for realmente um erro de autenticação/token
      if (isTokenError || error.config?.url?.includes("/auth/me")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("token_timestamp");
          localStorage.removeItem("user");

          // Redireciona para login se não estiver na página de login
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
