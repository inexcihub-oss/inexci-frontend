import api from "@/lib/api";
import { AuthResponse, LoginCredentials, RegisterData, User } from "@/types";
import { clearAvatarCache } from "@/lib/avatar-cache";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-token";
import { clearSessionFlag, markSession } from "@/lib/session-flag";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);

    if (typeof window !== "undefined" && data.access_token && data.user) {
      setAccessToken(data.access_token);
      markSession();

      localStorage.removeItem("token");
      localStorage.removeItem("token_timestamp");

      const { cpf, ...userWithoutSensitiveData } = data.user;
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

  async checkEmail(
    email: string,
  ): Promise<{ status: "available" | "pending_invite" | "registered" }> {
    const { data } = await api.post<{
      status: "available" | "pending_invite" | "registered";
    }>("/auth/check-email", { email: email.trim() });
    return data;
  },

  async checkPhone(
    phone: string,
  ): Promise<{ status: "available" | "registered" }> {
    const { data } = await api.post<{
      status: "available" | "registered";
    }>("/auth/check-phone", { phone: phone.trim() });
    return data;
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", userData);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");

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

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
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

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!getAccessToken();
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;

    localStorage.removeItem("token");
    localStorage.removeItem("token_timestamp");

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr || userStr === "undefined" || userStr === "null") {
        return null;
      }

      const user = JSON.parse(userStr);

      if (!user.id || !user.email) {
        throw new Error("Invalid user data structure");
      }

      return user;
    } catch (_error) {
      localStorage.removeItem("user");
      clearAccessToken();
      return null;
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post("/auth/sendRecoveryPasswordEmail", { email: email.trim() });
  },

  async validateRecoveryCode(email: string, code: string): Promise<string> {
    const { data } = await api.post<{ message: string; resetToken: string }>(
      "/auth/validateRecoveryPasswordCode",
      { email: email.trim(), code: code.trim().replace(/\s+/g, "") },
    );
    return data.resetToken;
  },

  async changePassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    await api.post("/auth/changePassword", {
      email: email.trim(),
      resetToken: resetToken.trim(),
      password: newPassword,
    });
  },

  async verifyEmail(
    token: string,
  ): Promise<{ message: string; email: string }> {
    const { data } = await api.post<{ message: string; email: string }>(
      "/auth/verifyEmail",
      { token },
    );
    return data;
  },

  async resendEmailVerification(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
      "/auth/resendEmailVerification",
    );
    return data;
  },
};
