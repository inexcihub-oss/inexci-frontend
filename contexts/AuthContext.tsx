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
import { useRouter } from "next/navigation";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  accountId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Carrega usuário do localStorage na inicialização
    const loadUser = () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const storedUser = authService.getCurrentUser();
      setUser(storedUser);
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authService.login({ email, password });
        setUser(response.user);
        router.push("/dashboard");
      } catch (error) {
        throw error;
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    // Revoga refresh tokens no backend via cookie httpOnly (fire-and-forget)
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/auth/logout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        ).catch(() => {});
      }
    } catch {
      // Ignora erros — o logout local é suficiente
    }
    authService.logout();
    setUser(null);
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

  const value = useMemo(
    () => ({
      user,
      loading,
      isDoctor,
      isAdmin,
      accountId,
      login,
      logout,
      updateUser,
    }),
    [user, loading, isDoctor, isAdmin, accountId, login, logout, updateUser],
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
