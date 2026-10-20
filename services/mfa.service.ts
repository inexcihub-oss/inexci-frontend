import api from "@/lib/api";
import { setAccessToken } from "@/lib/auth-token";
import type { MfaRecoveryCodesResponse, MfaSetupResponse } from "@/types";

export const mfaService = {
  async setup(): Promise<MfaSetupResponse> {
    const { data } = await api.post<MfaSetupResponse>("/auth/mfa/setup", {});
    return data;
  },

  async enable(code: string): Promise<MfaRecoveryCodesResponse> {
    const { data } = await api.post<MfaRecoveryCodesResponse>(
      "/auth/mfa/enable",
      { code: code.trim() },
    );
    return data;
  },

  async disable(password: string, code: string): Promise<void> {
    const { data } = await api.post<{ message: string; access_token?: string }>(
      "/auth/mfa/disable",
      { password, code: code.trim() },
    );
    if (data.access_token) setAccessToken(data.access_token);
  },

  async regenerateRecoveryCodes(
    code: string,
  ): Promise<MfaRecoveryCodesResponse> {
    const { data } = await api.post<MfaRecoveryCodesResponse>(
      "/auth/mfa/recovery-codes",
      { code: code.trim() },
    );
    return data;
  },
};
