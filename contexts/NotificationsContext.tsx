"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { Notification } from "@/services/notification.service";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from "@/lib/auth-token";

interface NotificationsContextValue {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  latest: Notification[];
  setLatest: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

/**
 * Mantém UMA conexão Socket.IO ao namespace `/notifications` e expõe a
 * contagem de não lidas via context. Componentes que precisam apenas do
 * número (sino na sidebar, header mobile) leem daqui em vez de criarem
 * suas próprias conexões/fetches.
 *
 * Estado inicial: o backend envia `notification:unread-count` logo após
 * autenticar o socket (ver `NotificationsGateway.handleConnection`). Em caso
 * de queda da conexão, o `socket.io-client` reconecta automaticamente e o
 * servidor reenvia o estado, então não há fallback HTTP — o WebSocket é a
 * única fonte de verdade enquanto o usuário estiver no dashboard.
 */
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLatest([]);
      return;
    }

    const token = getAccessToken();

    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const socket: Socket = io(`${apiUrl}/notifications`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("notification:unread-count", (payload: { count: number }) => {
      setUnreadCount(Math.max(0, payload?.count ?? 0));
    });

    socket.on("notification:new", (notification: Notification) => {
      setUnreadCount((prev) => prev + 1);
      setLatest((prev) => [notification, ...prev].slice(0, 10));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ unreadCount, setUnreadCount, latest, setLatest }),
    [unreadCount, latest],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Lê o estado compartilhado de notificações. Deve estar dentro de um
 * `NotificationsProvider`. Se usado fora, retorna um shape inerte para
 * evitar quebrar componentes em rotas que não montam o provider (ex.: rotas
 * públicas), assim como acontecia com o hook anterior.
 */
export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (ctx) return ctx;
  return inertContext;
}

const noop = () => {};
const inertContext: NotificationsContextValue = {
  unreadCount: 0,
  setUnreadCount: noop as React.Dispatch<React.SetStateAction<number>>,
  latest: [],
  setLatest: noop as React.Dispatch<React.SetStateAction<Notification[]>>,
};

/**
 * Hook utilitário compatível com a API antiga de `useNotifications`. Usado
 * pelos componentes que apenas precisam do contador e da lista.
 */
export function useNotifications() {
  const { unreadCount, setUnreadCount, latest, setLatest } =
    useNotificationsContext();
  const stableSetUnreadCount = useCallback(
    (next: React.SetStateAction<number>) => setUnreadCount(next),
    [setUnreadCount],
  );
  const stableSetLatest = useCallback(
    (next: React.SetStateAction<Notification[]>) => setLatest(next),
    [setLatest],
  );
  return {
    unreadCount,
    setUnreadCount: stableSetUnreadCount,
    latest,
    setLatest: stableSetLatest,
  };
}
