"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import {
  Notification,
  notificationService,
} from "@/services/notification.service";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from "@/lib/auth-token";
import { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import {
  BackgroundDocumentExtractionActive,
  BackgroundDocumentExtractionForeground,
  SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY,
  getScFromDocumentStorage,
  removeScFromDocumentStorage,
  setScFromDocumentStorage,
} from "@/lib/sc-from-document-background";

export interface SurgeryRequestChangedPayload {
  surgeryRequestId?: string;
  action?: "created" | "updated" | "status-updated";
}

export interface DocumentExtractionStatusPayload {
  jobId?: string;
  status: "processing" | "done" | "error";
  result?: unknown;
  message?: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  latest: Notification[];
  setLatest: React.Dispatch<React.SetStateAction<Notification[]>>;
  onSurgeryRequestChanged: (
    handler: (payload: SurgeryRequestChangedPayload) => void,
  ) => () => void;
  onDocumentExtractionStatus: (
    handler: (payload: DocumentExtractionStatusPayload) => void,
  ) => () => void;
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
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<Notification[]>([]);
  const surgeryRequestListenersRef = useRef(
    new Set<(payload: SurgeryRequestChangedPayload) => void>(),
  );
  const extractionStatusListenersRef = useRef(
    new Set<(payload: DocumentExtractionStatusPayload) => void>(),
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  const onSurgeryRequestChanged = useCallback(
    (handler: (payload: SurgeryRequestChangedPayload) => void) => {
      surgeryRequestListenersRef.current.add(handler);
      return () => {
        surgeryRequestListenersRef.current.delete(handler);
      };
    },
    [],
  );

  const onDocumentExtractionStatus = useCallback(
    (handler: (payload: DocumentExtractionStatusPayload) => void) => {
      extractionStatusListenersRef.current.add(handler);
      return () => {
        extractionStatusListenersRef.current.delete(handler);
      };
    },
    [],
  );

  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    const ctx = audioContextRef.current;
    if (!ctx || !audioUnlockedRef.current) return;
    if (ctx.state !== "running") return;

    try {
      const first = ctx.createOscillator();
      const firstGain = ctx.createGain();
      first.type = "sine";
      first.frequency.setValueAtTime(1046, ctx.currentTime);
      firstGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      firstGain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      firstGain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.12,
      );
      first.connect(firstGain);
      firstGain.connect(ctx.destination);
      first.start(ctx.currentTime);
      first.stop(ctx.currentTime + 0.12);

      const second = ctx.createOscillator();
      const secondGain = ctx.createGain();
      second.type = "sine";
      second.frequency.setValueAtTime(1318, ctx.currentTime + 0.13);
      secondGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.13);
      secondGain.gain.exponentialRampToValueAtTime(
        0.075,
        ctx.currentTime + 0.145,
      );
      secondGain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.24,
      );
      second.connect(secondGain);
      secondGain.connect(ctx.destination);
      second.start(ctx.currentTime + 0.13);
      second.stop(ctx.currentTime + 0.24);
    } catch {
      // Alguns navegadores podem bloquear em aba inativa.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    audioContextRef.current = ctx;

    const unlock = () => {
      if (audioUnlockedRef.current) return;
      void ctx
        .resume()
        .then(() => {
          audioUnlockedRef.current = ctx.state === "running";
        })
        .catch(() => {
          audioUnlockedRef.current = false;
        });
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audioUnlockedRef.current = false;
      audioContextRef.current = null;
      void ctx.close();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const stripUnreadPrefix = (title: string) =>
      title.replace(/^\(\d+\+?\)\s*/, "");

    const applyUnreadTitle = () => {
      const baseTitle = stripUnreadPrefix(document.title);
      const nextTitle =
        unreadCount > 0
          ? `(${unreadCount > 99 ? "99+" : unreadCount}) ${baseTitle}`
          : baseTitle;

      if (document.title !== nextTitle) {
        document.title = nextTitle;
      }
    };

    applyUnreadTitle();

    const titleElement = document.querySelector("title");
    if (!titleElement) return;

    const observer = new MutationObserver(() => {
      applyUnreadTitle();
    });

    observer.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [unreadCount]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLatest([]);
      return;
    }

    const token = getAccessToken();

    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;

    const socket: Socket = io(`${apiUrl}/notifications`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("notification:unread-count", (payload: { count: number }) => {
      const nextCount = Math.max(0, payload?.count ?? 0);
      const foreground =
        getScFromDocumentStorage<BackgroundDocumentExtractionForeground>(
          SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY,
        );

      setUnreadCount((prev) => {
        if (foreground && nextCount > prev) {
          // Enquanto o modal de extração estiver aberto, evita subir contador
          // por causa da notificação de conclusão da própria extração.
          return prev;
        }
        return nextCount;
      });
    });

    socket.on("notification:new", (notification: Notification) => {
      const metadata = notification.metadata;
      const category =
        metadata &&
        typeof metadata === "object" &&
        typeof metadata.category === "string"
          ? metadata.category
          : null;
      const notificationJobId =
        metadata &&
        typeof metadata === "object" &&
        typeof metadata.jobId === "string"
          ? metadata.jobId
          : null;

      const isDocumentExtractionNotification =
        category === "document_extraction" ||
        /análise de documento/i.test(notification.title || "") ||
        /análise do documento/i.test(notification.message || "") ||
        /docExtractionJobId=/.test(notification.link || "") ||
        /nova-via-documento/.test(notification.link || "");

      if (isDocumentExtractionNotification) {
        const foreground =
          getScFromDocumentStorage<BackgroundDocumentExtractionForeground>(
            SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY,
          );

        if (foreground) {
          if (!notificationJobId || foreground.jobId === notificationJobId) {
            void notificationService.markAsRead(notification.id).catch(() => {
              // Silencia erro de rede — aqui é apenas best effort.
            });
            return;
          }
        }
      }

      setUnreadCount((prev) => prev + 1);
      setLatest((prev) => [notification, ...prev].slice(0, 10));
      playNotificationSound();
    });

    socket.on(
      "surgery-request:changed",
      (payload: SurgeryRequestChangedPayload) => {
        surgeryRequestListenersRef.current.forEach((listener) => {
          listener(payload);
        });
      },
    );

    socket.on(
      "document-extraction:status",
      (payload: DocumentExtractionStatusPayload) => {
        if (payload?.jobId) {
          const active =
            getScFromDocumentStorage<BackgroundDocumentExtractionActive>(
              SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
            );

          if (active) {
            try {
              if (active.jobId === payload.jobId) {
                if (payload.status === "done" && payload.result) {
                  const result = payload.result as ExtractFromDocumentResponse;
                  setScFromDocumentStorage(
                    SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY,
                    {
                      ...result,
                      originalFileName:
                        result.originalFileName || active.fileName,
                    },
                  );
                  removeScFromDocumentStorage(
                    SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY,
                  );
                }

                if (payload.status === "error") {
                  setScFromDocumentStorage(
                    SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY,
                    payload.message ||
                      "Não foi possível concluir a análise do documento.",
                  );
                }

                if (payload.status === "done" || payload.status === "error") {
                  removeScFromDocumentStorage(
                    SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
                  );
                }
              }
            } catch {
              removeScFromDocumentStorage(
                SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
              );
            }
          }
        }

        extractionStatusListenersRef.current.forEach((listener) => {
          listener(payload);
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [playNotificationSound, userId]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount,
      setUnreadCount,
      latest,
      setLatest,
      onSurgeryRequestChanged,
      onDocumentExtractionStatus,
    }),
    [onDocumentExtractionStatus, onSurgeryRequestChanged, unreadCount, latest],
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
  onSurgeryRequestChanged: () => noop,
  onDocumentExtractionStatus: () => noop,
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
