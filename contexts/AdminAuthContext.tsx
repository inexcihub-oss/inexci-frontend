"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearAdminAccessToken,
  onAdminSessionExpired,
  type AdminProfile,
} from "@/lib/admin-api";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-nav";
import { adminKeys } from "@/lib/query-keys";
import {
  adminAuthService,
  type AdminLoginStep,
  type AdminMfaSetup,
} from "@/services/admin-auth.service";

export interface AdminAuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminLoginStep>;
  verifyMfa: (mfaToken: string, code: string) => Promise<AdminProfile>;
  startMfaSetup: (setupToken: string) => Promise<AdminMfaSetup>;
  enableMfa: (
    setupToken: string,
    code: string,
    onRecoveryCodes?: (codes: string[]) => void,
  ) => Promise<string[]>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const dropAdminQueries = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: adminKeys.all });
    queryClient.removeQueries({ queryKey: adminKeys.all });
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    adminAuthService
      .refresh()
      .then((session) => {
        if (active) setAdmin(session.admin);
      })
      .catch(() => {
        clearAdminAccessToken();
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onAdminSessionExpired(() => {
        setAdmin(null);
        dropAdminQueries();
      }),
    [dropAdminQueries],
  );

  const login = useCallback(
    (email: string, password: string) =>
      adminAuthService.login(email, password),
    [],
  );

  const verifyMfa = useCallback(
    async (mfaToken: string, code: string) => {
      const session = await adminAuthService.verifyMfa(mfaToken, code);
      dropAdminQueries();
      setAdmin(session.admin);
      return session.admin;
    },
    [dropAdminQueries],
  );

  const startMfaSetup = useCallback(
    (setupToken: string) => adminAuthService.setupMfa(setupToken),
    [],
  );

  const enableMfa = useCallback(
    async (
      setupToken: string,
      code: string,
      onRecoveryCodes?: (codes: string[]) => void,
    ) => {
      const result = await adminAuthService.enableMfa(setupToken, code);
      onRecoveryCodes?.(result.recoveryCodes);
      dropAdminQueries();
      setAdmin(result.admin);
      return result.recoveryCodes;
    },
    [dropAdminQueries],
  );

  const logout = useCallback(async () => {
    try {
      await adminAuthService.logout();
    } catch {
      clearAdminAccessToken();
    }
    setAdmin(null);
    dropAdminQueries();
    router.replace(ADMIN_LOGIN_PATH);
  }, [dropAdminQueries, router]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      loading,
      login,
      verifyMfa,
      startMfaSetup,
      enableMfa,
      logout,
    }),
    [admin, loading, login, verifyMfa, startMfaSetup, enableMfa, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth precisa estar dentro de AdminAuthProvider");
  }
  return context;
}
