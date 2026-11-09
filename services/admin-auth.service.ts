import adminApi, {
  clearAdminAccessToken,
  refreshAdminSession,
  setAdminAccessToken,
  type AdminProfile,
  type AdminSession,
} from "@/lib/admin-api";

export type AdminLoginStep =
  { step: "mfa"; mfaToken: string } | { step: "mfa_setup"; setupToken: string };

export interface AdminMfaSetup {
  secret: string;
  formattedSecret: string;
  otpauthUri: string;
}

export interface AdminMfaEnableResult extends AdminSession {
  recoveryCodes: string[];
}

export const adminAuthService = {
  async login(email: string, password: string): Promise<AdminLoginStep> {
    const { data } = await adminApi.post<AdminLoginStep>("/admin/auth/login", {
      email,
      password,
    });
    return data;
  },

  async verifyMfa(mfaToken: string, code: string): Promise<AdminSession> {
    const { data } = await adminApi.post<AdminSession>(
      "/admin/auth/login/mfa",
      { mfaToken, code },
    );
    setAdminAccessToken(data.accessToken);
    return data;
  },

  async setupMfa(setupToken: string): Promise<AdminMfaSetup> {
    const { data } = await adminApi.post<AdminMfaSetup>(
      "/admin/auth/mfa/setup",
      { setupToken },
    );
    return data;
  },

  async enableMfa(
    setupToken: string,
    code: string,
  ): Promise<AdminMfaEnableResult> {
    const { data } = await adminApi.post<AdminMfaEnableResult>(
      "/admin/auth/mfa/enable",
      { setupToken, code },
    );
    setAdminAccessToken(data.accessToken);
    return data;
  },

  refresh(): Promise<AdminSession> {
    return refreshAdminSession();
  },

  async me(): Promise<AdminProfile> {
    const { data } = await adminApi.get<AdminProfile>("/admin/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    try {
      await adminApi.post<void>("/admin/auth/logout");
    } finally {
      clearAdminAccessToken();
    }
  },

  async regenerateRecoveryCodes(
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const { data } = await adminApi.post<{ recoveryCodes: string[] }>(
      "/admin/auth/mfa/recovery-codes",
      { code },
    );
    return data;
  },

  async acceptInvite(
    email: string,
    token: string,
    password: string,
  ): Promise<void> {
    await adminApi.post<void>("/admin/auth/accept-invite", {
      email,
      token,
      password,
    });
  },
};
