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
import { clearAccessToken, getAccessToken } from "@/lib/auth-token";
import { isSessaoExpirada, refreshSession } from "@/lib/api";
import { clearSessionFlag, hasSessionHint } from "@/lib/session-flag";
import { clearStoredUser } from "@/lib/session-storage";
import { consentService } from "@/services/consent.service";
import { billingService } from "@/services/billing.service";
import type { ConsentStatus, ConsentType } from "@/types/consent.types";
import { useRouter } from "next/navigation";
import { Permission, resolveHome } from "@/lib/permissions";
import { emiteDocumentosClinicos } from "@/lib/professional-council";
import { QUOTA_QUERY_KEY } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import type { BillingBlockReason } from "@/lib/http-error";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDoctor: boolean;
  isPhysician: boolean;
  canIssueClinicalDocuments: boolean;
  isAdmin: boolean;
  isAccountOwner: boolean;
  accountId: string | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  consents: ConsentStatus | null;
  pendingConsents: ConsentType[];
  consentsLoading: boolean;
  subscription: SubscriptionDetail | null;
  subscriptionLoading: boolean;
  refreshSubscription: (forUser?: User | null) => Promise<void>;
  canCreateSurgeryRequest: boolean;
  isInTrial: boolean;
  isSuspended: boolean;
  blockReason: string | null;
  blockReasonCode: BillingBlockReason | null;
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
  const queryClient = useQueryClient();
  const consentsRequestRef = useRef<Promise<void> | null>(null);
  const subscriptionRequestRef = useRef<Promise<void> | null>(null);
  const initialLoadRef = useRef(false);

  const applyConsentsFromUser = useCallback((currentUser: User) => {
    if (currentUser.consents) {
      setConsents(currentUser.consents);
      return true;
    }
    return false;
  }, []);

  const refreshConsents = useCallback(
    async (forUser?: User | null) => {
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
    },
    [user],
  );

  const refreshSubscription = useCallback(
    async (forUser?: User | null) => {
      if (typeof window === "undefined") return;
      const effectiveUser = forUser !== undefined ? forUser : user;
      if (!effectiveUser) {
        setSubscription(null);
        void queryClient.removeQueries({ queryKey: QUOTA_QUERY_KEY });
        return;
      }

      void queryClient.invalidateQueries({ queryKey: QUOTA_QUERY_KEY });

      if (subscriptionRequestRef.current) {
        return subscriptionRequestRef.current;
      }
      setSubscriptionLoading(true);
      const promise = (async () => {
        try {
          const detail = await billingService.getMySubscription();
          setSubscription(detail);
        } catch (error) {
          logger.warn("N\u00e3o foi poss\u00edvel carregar assinatura:", error);
          setSubscription(null);
        } finally {
          setSubscriptionLoading(false);
          subscriptionRequestRef.current = null;
        }
      })();
      subscriptionRequestRef.current = promise;
      return promise;
    },
    [user, queryClient],
  );

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const loadUser = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      try {
        if (!getAccessToken()) {
          if (!hasSessionHint()) {
            setUser(null);
            setConsents(null);
            setSubscription(null);
            setLoading(false);
            return;
          }
          try {
            await refreshSession();
          } catch (erro) {
            if (isSessaoExpirada(erro)) {
              clearAccessToken();
              clearSessionFlag();
              clearStoredUser();
              setUser(null);
              setConsents(null);
              setSubscription(null);
              setLoading(false);
              return;
            }
            logger.warn("Refresh transitório falhou; mantendo a sessão:", erro);
            const cache = authService.getCurrentUser();
            if (cache) {
              setUser(cache);
              applyConsentsFromUser(cache);
              setLoading(false);
              return;
            }
          }
        }

        const storedUserId = authService.getCurrentUser()?.id ?? null;

        const currentUser = await authService.me();

        if (storedUserId && storedUserId !== currentUser.id) {
          logger.warn(
            "[auth] Mismatch de sessão detectado — limpando sessão local e redirecionando para login",
          );
          clearAccessToken();
          clearStoredUser();
          setUser(null);
          setConsents(null);
          setSubscription(null);
          router.push("/login");
          return;
        }

        setUser(currentUser);
        const consentsFromMe = applyConsentsFromUser(currentUser);
        const consentsPromise = consentsFromMe
          ? Promise.resolve()
          : refreshConsents(currentUser);
        if (currentUser.role === "admin") {
          void refreshSubscription(currentUser);
        }
        await consentsPromise;
      } catch (error) {
        logger.warn("Sessão inválida detectada na inicialização:", error);
        setUser(null);
        setConsents(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [refreshConsents, refreshSubscription, router, applyConsentsFromUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authService.login({ email, password });
      setUser(response.user);
      const consentsFromLogin = applyConsentsFromUser(response.user);
      const consentsPromise = consentsFromLogin
        ? Promise.resolve()
        : refreshConsents(response.user);
      if (response.user?.role === "admin") {
        void refreshSubscription(response.user);
      }
      await consentsPromise;

      router.push(resolveHome(response.user?.permissions ?? []));
    },
    [router, refreshConsents, refreshSubscription, applyConsentsFromUser],
  );

  const register = useCallback(
    async (userData: import("@/types").RegisterData) => {
      await authService.register(userData);
      router.push("/login?registered=true");
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

  const isAuthenticated = useMemo(() => !!user, [user]);
  const isDoctor = useMemo(() => user?.isDoctor ?? false, [user]);
  const isPhysician = useMemo(() => user?.isPhysician ?? false, [user]);
  const canIssueClinicalDocuments = useMemo(
    () =>
      user?.canIssueClinicalDocuments ??
      (!!user?.isDoctor && emiteDocumentosClinicos(user.doctorProfile)),
    [user],
  );
  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const accountId = useMemo(() => user?.accountId ?? null, [user]);
  const isAccountOwner = useMemo(
    () => !!user && user.role === "admin" && user.id === user.accountId,
    [user],
  );
  const permissions = useMemo<Permission[]>(
    () => user?.permissions ?? [],
    [user],
  );
  const can = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  );
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

  const { canCreateSurgeryRequest, blockReason, blockReasonCode } = useMemo<{
    canCreateSurgeryRequest: boolean;
    blockReason: string | null;
    blockReasonCode: BillingBlockReason | null;
  }>(() => {
    const liberado = {
      canCreateSurgeryRequest: true,
      blockReason: null,
      blockReasonCode: null,
    };
    if (!subscription) return liberado;

    const { status } = subscription.subscription;
    if (status === "suspended") {
      return {
        canCreateSurgeryRequest: false,
        blockReason:
          "Sua assinatura est\u00e1 suspensa. Cadastre um m\u00e9todo de pagamento ou regularize sua fatura para continuar.",
        blockReasonCode: "subscription_suspended",
      };
    }
    if (status === "canceled") {
      return {
        canCreateSurgeryRequest: false,
        blockReason:
          "Sua assinatura foi cancelada. Contrate um plano para continuar.",
        blockReasonCode: "subscription_canceled",
      };
    }
    const quota = subscription.quota;
    if (quota && !quota.isUnlimited && quota.remaining <= 0) {
      return {
        canCreateSurgeryRequest: false,
        blockReason: `Voc\u00ea atingiu o limite de ${quota.limit} solicita\u00e7\u00f5es deste ciclo. Fa\u00e7a upgrade para continuar.`,
        blockReasonCode: "quota_exceeded",
      };
    }
    return liberado;
  }, [subscription]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      isDoctor,
      isPhysician,
      canIssueClinicalDocuments,
      isAdmin,
      isAccountOwner,
      accountId,
      permissions,
      can,
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
      blockReasonCode,
      login,
      register,
      logout,
      updateUser,
      refreshConsents,
    }),
    [
      user,
      loading,
      isAuthenticated,
      isDoctor,
      isPhysician,
      canIssueClinicalDocuments,
      isAdmin,
      isAccountOwner,
      accountId,
      permissions,
      can,
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
      blockReasonCode,
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
