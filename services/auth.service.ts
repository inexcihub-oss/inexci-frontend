import api from "@/lib/api";
import { AuthResponse, LoginCredentials, RegisterData, User } from "@/types";

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);

    // Armazena token e usuário (sanitizado)
    if (typeof window !== "undefined" && data.access_token && data.user) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("token_timestamp", Date.now().toString());

      // Remove dados sensíveis antes de armazenar
      const { cpf, ...userWithoutSensitiveData } = data.user;
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...userWithoutSensitiveData,
          // Armazena apenas os últimos 4 dígitos do CPF para identificação
          cpfMask: cpf ? `***.***.***-${cpf.slice(-2)}` : undefined,
        }),
      );
    }

    return data;
  },

  /**
   * Realiza registro de novo usuário
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", userData);
    return data;
  },

  /**
   * Busca informações do usuário autenticado
   */
  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");

    // Atualiza dados do usuário no localStorage (sanitizado)
    if (typeof window !== "undefined") {
      const { cpf, ...userWithoutSensitiveData } = data;
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...userWithoutSensitiveData,
          cpfMask: cpf ? `***.***.***-${cpf.slice(-2)}` : undefined,
        }),
      );
    }

    return data;
  },

  /**
   * Realiza logout do usuário
   */
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("token_timestamp");
      localStorage.removeItem("user");
    }
  },

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("token");
  },

  /**
   * Retorna o usuário armazenado no localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr || userStr === "undefined" || userStr === "null") {
        return null;
      }

      const user = JSON.parse(userStr);

      // Validação básica da estrutura do objeto
      if (!user.id || !user.email) {
        throw new Error("Invalid user data structure");
      }

      return user;
    } catch (error) {
      // Limpa dados corrompidos ou inválidos
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  },

  /**
   * Solicita código de recuperação de senha
   */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post("/auth/forgot-password", { email });
  },

  /**
   * Valida código de recuperação
   */
  async validateRecoveryCode(email: string, code: string): Promise<boolean> {
    const { data } = await api.post("/auth/validate-code", { email, code });
    return data.valid;
  },

  /**
   * Altera senha do usuário
   */
  async changePassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    await api.post("/auth/change-password", {
      email,
      code,
      newPassword,
    });
  },
};
