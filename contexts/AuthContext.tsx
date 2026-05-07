"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { User } from "@/types";
import { authService } from "@/services/auth.service";
import { consentService } from "@/services/consent.service";
import type { ConsentStatus, ConsentType } from "@/types/consent.types";
import { useRouter } from "next/navigation";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  accountId: string | null;
  consents: ConsentStatus[];
  pendingConsents: ConsentType[];
  consentsLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: import("@/types").RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: () => Promise<void>;
  refreshConsents: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentStatus[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const router = useRouter();

  const refreshConsents = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("token")) {
      setConsents([]);
      return;
    }
    setConsentsLoading(true);
    try {
      const list = await consentService.getStatus();
      setConsents(list);
    } catch (error) {
      console.error("Erro ao carregar consentimentos:", error);
    } finally {
      setConsentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const storedUser = authService.getCurrentUser();
      setUser(storedUser);
      setLoading(false);

      if (storedUser) {
        await refreshConsents();
      }
    };

    loadUser();
  }, [refreshConsents]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authService.login({ email, password });
        setUser(response.user);
        await refreshConsents();
        router.push("/solicitacoes-cirurgicas");
      } catch (error) {
        throw error;
      }
    },
    [router, refreshConsents],
  );

  const register = useCallback(
    async (userData: import("@/types").RegisterData) => {
      try {
        await authService.register(userData);
        router.push("/login?registered=true");
      } catch (error) {
        throw error;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setConsents([]);
    router.push("/login");
  }, [router]);

  const updateUser = useCallback(async () => {
    try {
      const updatedUser = await authService.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
    }
  }, []);

  const isDoctor = useMemo(() => user?.is_doctor ?? false, [user]);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const accountId = useMemo(() => user?.account_id ?? null, [user]);
  const pendingConsents = useMemo<ConsentType[]>(
    () =>
      consents.filter((c) => c.isRequired && !c.isAccepted).map((c) => c.type),
    [consents],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isDoctor,
      isAdmin,
      accountId,
      consents,
      pendingConsents,
      consentsLoading,
      login,
      register,
      logout,
      updateUser,
      refreshConsents,
    }),
    [
      user,
      loading,
      isDoctor,
      isAdmin,
      accountId,
      consents,
      pendingConsents,
      consentsLoading,
      login,
      register,
      logout,
      updateUser,
      refreshConsents,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
