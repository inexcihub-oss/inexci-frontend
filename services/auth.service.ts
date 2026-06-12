import api from "@/lib/api";
import { AuthResponse, LoginCredentials, RegisterData, User } from "@/types";
import { clearAvatarCache } from "@/lib/avatar-cache";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-token";
import { clearSessionFlag, markSession } from "@/lib/session-flag";

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);

    // Armazena token apenas em memória e usuário (sanitizado) no localStorage
    if (typeof window !== "undefined" && data.access_token && data.user) {
      setAccessToken(data.access_token);
      // Marca que há sessão para permitir o refresh proativo no próximo reload.
      markSession();

      // Remove chaves legadas de versão anterior que armazenava token no localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("token_timestamp");

      // refresh_token agora é enviado via cookie httpOnly pelo backend

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
    // Não salva token/sessão: o usuário precisa confirmar o e-mail antes de logar.
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
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignora erros — o logout local é suficiente
    }
    if (typeof window !== "undefined") {
      const currentUser = this.getCurrentUser?.();
      if (currentUser?.id) {
        clearAvatarCache(currentUser.id);
      }
      clearAccessToken();
      clearSessionFlag();
      localStorage.removeItem("user");
    }
  },

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!getAccessToken();
  },

  /**
   * Retorna o usuário armazenado no localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;

    // Remove chaves legadas na primeira leitura após atualização de versão
    localStorage.removeItem("token");
    localStorage.removeItem("token_timestamp");

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
    } catch (_error) {
      // Limpa dados corrompidos ou inválidos
      localStorage.removeItem("user");
      clearAccessToken();
      return null;
    }
  },

  /**
   * Solicita código de recuperação de senha
   */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post("/auth/sendRecoveryPasswordEmail", { email });
  },

  /**
   * Valida código de recuperação e retorna o reset token de uso único,
   * exigido na etapa de troca de senha.
   */
  async validateRecoveryCode(email: string, code: string): Promise<string> {
    const { data } = await api.post<{ message: string; resetToken: string }>(
      "/auth/validateRecoveryPasswordCode",
      { email, code },
    );
    return data.resetToken;
  },

  /**
   * Altera senha do usuário usando o reset token emitido na validação do código.
   */
  async changePassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    await api.post("/auth/changePassword", {
      email,
      resetToken,
      password: newPassword,
    });
  },

  /**
   * Confirma o e-mail do usuário a partir do token recebido por e-mail
   */
  async verifyEmail(
    token: string,
  ): Promise<{ message: string; email: string }> {
    const { data } = await api.post<{ message: string; email: string }>(
      "/auth/verifyEmail",
      { token },
    );
    return data;
  },

  /**
   * Reenvia o e-mail de confirmação para o usuário autenticado
   */
  async resendEmailVerification(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
      "/auth/resendEmailVerification",
    );
    return data;
  },
};
