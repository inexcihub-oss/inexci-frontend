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
import { consentService } from "@/services/consent.service";
import { billingService } from "@/services/billing.service";
import type { ConsentStatus, ConsentType } from "@/types/consent.types";
import { useRouter } from "next/navigation";
import { Permission, resolveHome } from "@/lib/permissions";
import { QUOTA_QUERY_KEY } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import type { BillingBlockReason } from "@/lib/http-error";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  /** True quando há uma sessão resolvida em memória (usuário carregado). */
  isAuthenticated: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  /**
   * True apenas para o **dono** da conta (`user.id === user.accountId`).
   * Um admin delegado tem `isAdmin`, mas não gerencia assinatura, plano nem
   * pagamento — só ele vê a aba de plano e os CTAs de upgrade.
   */
  isAccountOwner: boolean;
  accountId: string | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
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
  /**
   * Mesmo bloqueio em forma de c\u00f3digo, alinhado ao `reason` do HTTP 402 do
   * backend \u2014 permite avisar antes da chamada com a mesma c\u00f3pia do aviso
   * p\u00f3s-erro. null se n\u00e3o estiver bloqueado.
   */
  blockReasonCode: BillingBlockReason | null;
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

      // A cota do banner tem fonte própria (`GET /billing/quota`, aberta a
      // quem tem Solicitações). Invalidar aqui faz com que todo ponto que já
      // sincroniza a cobrança — cada envio de solicitação no `SendRequestModal`
      // — atualize o banner junto, sem precisar lembrar de chamar as duas.
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
        // Se não há token em memória (reload de página), faz refresh proativo para
        // evitar o ciclo 401 → refresh → retry no /me. Isso resolve a sessão real
        // (válida ou não) em qualquer rota — inclusive nas públicas, onde o guard
        // reverso depende de `isAuthenticated` para expulsar usuários já logados.
        //
        // Só dispara o refresh quando há pista de sessão prévia (`hasSessionHint`):
        // um visitante anônimo não tem cookie de refresh e o POST garantiria um
        // 400 ("Refresh token ausente") — puro ruído. `refreshSession` é o mesmo
        // single-flight do interceptor, evitando corrida de rotação.
        if (!getAccessToken()) {
          if (!hasSessionHint()) {
            // Anônimo: nada a restaurar.
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
              // Cookie de refresh ausente ou expirado — sessão inválida.
              clearAccessToken();
              clearSessionFlag();
              localStorage.removeItem("user");
              setUser(null);
              setConsents(null);
              setSubscription(null);
              setLoading(false);
              return;
            }
            // Falha transitória (429 do throttler, 5xx, rede): o cookie de
            // refresh continua valendo, então a sessão não acabou. Seguir para
            // o `/auth/me` sem access token só produziria outro 401 → outro
            // refresh throttled → tela de login. Renderiza com o usuário em
            // cache e deixa a próxima chamada renovar o token; se a sessão
            // estiver mesmo morta, o 401 seguinte cai no `forceLogout`.
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
        // P12 / 4.4b: consents embutidos no `/auth/me` — sem round-trip extra.
        const consentsFromMe = applyConsentsFromUser(currentUser);
        const consentsPromise = consentsFromMe
          ? Promise.resolve()
          : refreshConsents(currentUser);
        if (currentUser.role === "admin") {
          void refreshSubscription(currentUser);
        }
        await consentsPromise;
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
  }, [refreshConsents, refreshSubscription, router, applyConsentsFromUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authService.login({ email, password });
        setUser(response.user);
        // P12 / 4.4b: usa consents do payload quando disponíveis; senão fallback de rede.
        const consentsFromLogin = applyConsentsFromUser(response.user);
        const consentsPromise = consentsFromLogin
          ? Promise.resolve()
          : refreshConsents(response.user);
        if (response.user?.role === "admin") {
          void refreshSubscription(response.user);
        }
        await consentsPromise;

        // A casa depende das áreas liberadas: mandar todo mundo para
        // /solicitacoes-cirurgicas fazia quem não tem `solicitacoes` entrar
        // numa rota proibida e ser devolvido pelo `PermissionRouteGuard`.
        router.push(resolveHome(response.user?.permissions ?? []));
      } catch (error) {
        throw error;
      }
    },
    [router, refreshConsents, refreshSubscription, applyConsentsFromUser],
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

  const isAuthenticated = useMemo(() => !!user, [user]);
  const isDoctor = useMemo(() => user?.isDoctor ?? false, [user]);
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

  /**
   * Regras consolidadas de bloqueio:
   * 1. Sem assinatura carregada (colaborador): n\u00e3o bloqueia (servidor decide)
   * 2. Suspensa/cancelada: bloqueia
   * 3. Cota saturada: bloqueia
   */
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
