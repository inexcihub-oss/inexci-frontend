"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { logger } from "@/lib/logger";
import { User, SubscriptionDetail } from "@/types";
import { authService } from "@/services/auth.service";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import axios from "axios";
import api from "@/lib/api";
import { consentService } from "@/services/consent.service";
import { billingService } from "@/services/billing.service";
import type { ConsentStatus, ConsentType } from "@/types/consent.types";
import { useRouter } from "next/navigation";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  accountId: string | null;
  consents: ConsentStatus | null;
  pendingConsents: ConsentType[];
  consentsLoading: boolean;
  // Billing
  subscription: SubscriptionDetail | null;
  subscriptionLoading: boolean;
  refreshSubscription: (forUser?: User | null) => Promise<void>;
  /** True quando a assinatura permite criar/enviar novas solicita\u00e7\u00f5es. */
  canCreateSurgeryRequest: boolean;
  isInTrial: boolean;
  isSuspended: boolean;
  /** Motivo do bloqueio (para tooltip). null se n\u00e3o estiver bloqueado. */
  blockReason: string | null;
  // Auth
  login: (email: string, password: string) => Promise<void>;
  register: (userData: import("@/types").RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: () => Promise<void>;
  refreshConsents: (forUser?: User | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentStatus | null>(null);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const router = useRouter();
  const consentsRequestRef = useRef<Promise<void> | null>(null);
  const subscriptionRequestRef = useRef<Promise<void> | null>(null);
  const initialLoadRef = useRef(false);

  const refreshConsents = useCallback(async (forUser?: User | null) => {
    if (typeof window === "undefined") return;
    const effectiveUser = forUser !== undefined ? forUser : user;
    if (!effectiveUser) {
      setConsents(null);
      return;
    }
    if (consentsRequestRef.current) {
      return consentsRequestRef.current;
    }
    setConsentsLoading(true);
    const promise = (async () => {
      try {
        const status = await consentService.getStatus();
        setConsents(status);
      } catch (error) {
        logger.error("Erro ao carregar consentimentos:", error);
      } finally {
        setConsentsLoading(false);
        consentsRequestRef.current = null;
      }
    })();
    consentsRequestRef.current = promise;
    return promise;
  }, [user]);

  const refreshSubscription = useCallback(async (forUser?: User | null) => {
    if (typeof window === "undefined") return;
    const effectiveUser = forUser !== undefined ? forUser : user;
    if (!effectiveUser) {
      setSubscription(null);
      return;
    }
    if (subscriptionRequestRef.current) {
      return subscriptionRequestRef.current;
    }
    setSubscriptionLoading(true);
    const promise = (async () => {
      try {
        const detail = await billingService.getMySubscription();
        setSubscription(detail);
      } catch (error) {
        // Colaboradores podem n\u00e3o ter acesso a essa rota \u2014 silencioso.
        logger.warn("N\u00e3o foi poss\u00edvel carregar assinatura:", error);
        setSubscription(null);
      } finally {
        setSubscriptionLoading(false);
        subscriptionRequestRef.current = null;
      }
    })();
    subscriptionRequestRef.current = promise;
    return promise;
  }, [user]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const loadUser = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      try {
        // Se não há token em memória (reload de página), faz refresh proativo para
        // evitar o ciclo 401 → refresh → retry no /me.
        if (!getAccessToken()) {
          try {
            const { data } = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true, headers: { "ngrok-skip-browser-warning": "true" } },
            );
            setAccessToken(data.access_token);
          } catch {
            // Cookie de refresh ausente ou expirado — sessão inválida.
            setUser(null);
            setConsents(null);
            setSubscription(null);
            setLoading(false);
            return;
          }
        }

        // Captura o ID armazenado ANTES de chamar me(), pois me() sobrescreve o localStorage
        const storedUserId = authService.getCurrentUser()?.id ?? null;

        const currentUser = await authService.me();

        // Detecta contaminação de sessão: o cookie de refresh pertence a outro usuário
        if (storedUserId && storedUserId !== currentUser.id) {
          logger.warn(
            "[auth] Mismatch de sessão detectado — limpando sessão local e redirecionando para login",
          );
          clearAccessToken();
          localStorage.removeItem("user");
          setUser(null);
          setConsents(null);
          setSubscription(null);
          router.push("/login");
          return;
        }

        setUser(currentUser);
        await refreshConsents(currentUser);
        if (currentUser.role === "admin") {
          await refreshSubscription(currentUser);
        }
      } catch (error) {
        // Para erros de autenticação (401/403), o interceptor do axios já chamou
        // forceLogout() que limpou o token e o localStorage. Apenas sincroniza o estado React.
        // Não chama authService.logout() para evitar um ciclo de requests desnecessários.
        logger.warn("Sessão inválida detectada na inicialização:", error);
        setUser(null);
        setConsents(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [refreshConsents, refreshSubscription, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authService.login({ email, password });
        setUser(response.user);
        await refreshConsents(response.user);
        if (response.user?.role === "admin") {
          await refreshSubscription(response.user);
        }
        router.push("/solicitacoes-cirurgicas");
      } catch (error) {
        throw error;
      }
    },
    [router, refreshConsents, refreshSubscription],
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
    setConsents(null);
    setSubscription(null);
    router.push("/login");
  }, [router]);

  const updateUser = useCallback(async () => {
    try {
      const updatedUser = await authService.me();
      setUser(updatedUser);
    } catch (error) {
      logger.error("Erro ao atualizar usu\u00e1rio:", error);
    }
  }, []);

  const isDoctor = useMemo(() => user?.isDoctor ?? false, [user]);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const accountId = useMemo(() => user?.accountId ?? null, [user]);
  const pendingConsents = useMemo<ConsentType[]>(
    () => consents?.pendingRequired ?? [],
    [consents],
  );

  const isInTrial = useMemo(
    () => subscription?.subscription.status === "trialing",
    [subscription],
  );
  const isSuspended = useMemo(
    () =>
      subscription?.subscription.status === "suspended" ||
      subscription?.subscription.status === "canceled",
    [subscription],
  );

  /**
   * Regras consolidadas de bloqueio:
   * 1. Sem assinatura carregada (colaborador): n\u00e3o bloqueia (servidor decide)
   * 2. Suspensa/cancelada: bloqueia
   * 3. Cota saturada: bloqueia
   */
  const { canCreateSurgeryRequest, blockReason } = useMemo<{
    canCreateSurgeryRequest: boolean;
    blockReason: string | null;
  }>(() => {
    if (!subscription) {
      return { canCreateSurgeryRequest: true, blockReason: null };
    }
    const { status } = subscription.subscription;
    if (status === "suspended") {
      return {
        canCreateSurgeryRequest: false,
        blockReason:
          "Sua assinatura est\u00e1 suspensa. Cadastre um m\u00e9todo de pagamento ou regularize sua fatura para continuar.",
      };
    }
    if (status === "canceled") {
      return {
        canCreateSurgeryRequest: false,
        blockReason:
          "Sua assinatura foi cancelada. Contrate um plano para continuar.",
      };
    }
    const quota = subscription.quota;
    if (quota && !quota.isUnlimited && quota.remaining <= 0) {
      return {
        canCreateSurgeryRequest: false,
        blockReason: `Voc\u00ea atingiu o limite de ${quota.limit} solicita\u00e7\u00f5es deste ciclo. Fa\u00e7a upgrade para continuar.`,
      };
    }
    return { canCreateSurgeryRequest: true, blockReason: null };
  }, [subscription]);

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
      subscription,
      subscriptionLoading,
      refreshSubscription,
      canCreateSurgeryRequest,
      isInTrial,
      isSuspended,
      blockReason,
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
      subscription,
      subscriptionLoading,
      refreshSubscription,
      canCreateSurgeryRequest,
      isInTrial,
      isSuspended,
      blockReason,
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
