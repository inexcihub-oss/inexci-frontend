"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  X,
  Loader2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  FileWarning,
  User,
  Clock,
  Info,
  RefreshCw,
} from "lucide-react";
import { logger } from "@/lib/logger";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import Button from "@/components/ui/Button";
import NotificationActorAvatar from "@/components/notifications/NotificationActorAvatar";

const NOTIFICATION_TYPES = [
  { value: "", label: "Todos os tipos" },
  { value: "new_surgery_request", label: "Nova Solicitação" },
  { value: "status_update", label: "Mudança de Status" },
  { value: "pendency", label: "Pendência" },
  { value: "expiring_document", label: "Documento Expirando" },
  { value: "action_by_user", label: "Ação de Usuário" },
  { value: "stale", label: "Solicitação Parada" },
  { value: "info", label: "Informativo" },
];

const PAGE_SIZE = 20;

type NotificationConfig = {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
};

const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  new_surgery_request: {
    icon: FileText,
    bg: "bg-primary-50",
    text: "text-primary-600",
  },
  status_update: {
    icon: RefreshCw,
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  pendency: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  expiring_document: {
    icon: FileWarning,
    bg: "bg-orange-50",
    text: "text-orange-600",
  },
  action_by_user: {
    icon: User,
    bg: "bg-purple-50",
    text: "text-purple-600",
  },
  stale: {
    icon: Clock,
    bg: "bg-red-50",
    text: "text-red-500",
  },
  info: {
    icon: Info,
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
};

const getConfig = (type: string): NotificationConfig =>
  NOTIFICATION_CONFIG[type] ?? NOTIFICATION_CONFIG.info;

const getTypeLabel = (type: string) =>
  NOTIFICATION_TYPES.find((t) => t.value === type)?.label ?? type;

const getActorMetadata = (notification: Notification) => {
  const metadata = notification.metadata;
  if (!metadata || typeof metadata !== "object") return null;

  const actorId =
    typeof metadata.actorId === "string" ? metadata.actorId : undefined;
  const actorName =
    typeof metadata.actorName === "string" ? metadata.actorName : undefined;
  const actorAvatarUrl =
    typeof metadata.actorAvatarUrl === "string"
      ? metadata.actorAvatarUrl
      : null;

  if (!actorId && !actorName && !actorAvatarUrl) return null;

  return { actorId, actorName, actorAvatarUrl };
};

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [_total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        unreadOnly: filterUnreadOnly || undefined,
      });
      let filtered = response.notifications;
      if (filterType) {
        filtered = filtered.filter((n) => n.type === filterType);
      }
      setNotifications(filtered);
      setUnreadCount(response.unreadCount);
      setTotal(response.total);
    } catch (error) {
      logger.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterUnreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Erro ao marcar como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      const wasUnread = notifications.find(
        (n) => n.id === notificationId && !n.read,
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Erro ao remover notificação:", error);
    }
  };

  const hasMore = notifications.length === PAGE_SIZE;

  return (
    <PageContainer className="border-gray-200">
      {/* Header */}
      <div className="flex-none flex items-center justify-between gap-3 px-4 lg:px-8 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <h1 className="ds-page-title">Notificações</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-semibold tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-1.5 shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Marcar todas como lidas</span>
            <span className="sm:hidden">Marcar lidas</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex-none flex flex-wrap items-center gap-2 px-4 lg:px-8 py-2.5 border-b border-gray-200 bg-gray-50/60">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(0);
          }}
          className="flex-1 sm:flex-none h-9 md:h-10 rounded-xl border border-neutral-100 bg-white px-3 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
        >
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setFilterUnreadOnly(!filterUnreadOnly);
            setPage(0);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all min-h-[36px] md:min-h-[40px]",
            filterUnreadOnly
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "border-neutral-100 bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          {filterUnreadOnly && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
          )}
          Não lidas
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              Nenhuma notificação
            </p>
            <p className="ds-caption max-w-xs">
              {filterType || filterUnreadOnly
                ? "Tente remover os filtros para ver todas as notificações"
                : "Você será notificado sobre atualizações importantes da plataforma"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const config = getConfig(notification.type);
              const Icon = config.icon;
              const actor = getActorMetadata(notification);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative flex items-start gap-3 px-4 lg:px-8 py-3.5 hover:bg-gray-50 transition-colors group",
                    !notification.read && "bg-primary-50/40",
                  )}
                >
                  {/* Unread dot */}
                  {!notification.read && (
                    <span className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                  )}

                  {/* Type icon */}
                  {notification.type === "action_by_user" && actor ? (
                    <NotificationActorAvatar
                      actorId={actor.actorId}
                      actorName={actor.actorName}
                      actorAvatarUrl={actor.actorAvatarUrl}
                      className="mt-0.5"
                    />
                  ) : (
                    <div
                      className={cn(
                        "shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center",
                        config.bg,
                      )}
                    >
                      <Icon className={cn("w-4 h-4", config.text)} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          if (!notification.read)
                            handleMarkAsRead(notification.id);
                        }}
                        className="block"
                      >
                        <p
                          className={cn(
                            "text-xs sm:text-sm font-medium leading-snug",
                            notification.read
                              ? "text-gray-600"
                              : "text-gray-900",
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="ds-caption mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </Link>
                    ) : (
                      <>
                        <p
                          className={cn(
                            "text-xs sm:text-sm font-medium leading-snug",
                            notification.read
                              ? "text-gray-600"
                              : "text-gray-900",
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="ds-caption mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </>
                    )}

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                          config.bg,
                          config.text,
                        )}
                      >
                        {getTypeLabel(notification.type)}
                      </span>
                      <span className="text-gray-300 text-[10px]">·</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Marcar como lida"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && (notifications.length > 0 || page > 0) && (
        <div className="flex-none flex items-center justify-between px-4 lg:px-8 py-3 border-t border-gray-200 bg-gray-50/60">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <span className="text-xs text-gray-500 tabular-nums">
            Página {page + 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
