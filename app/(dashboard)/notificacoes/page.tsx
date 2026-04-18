"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  X,
  Loader2,
  Filter,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "new_surgery_request":
      return "🔔";
    case "status_update":
      return "📋";
    case "pendency":
      return "⚠️";
    case "expiring_document":
      return "📄";
    case "action_by_user":
      return "👤";
    case "stale":
      return "⏰";
    default:
      return "ℹ️";
  }
};

const getNotificationTypeLabel = (type: string) => {
  const found = NOTIFICATION_TYPES.find((t) => t.value === type);
  return found?.label ?? type;
};

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [_total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
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
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterUnreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await notificationService.deleteNotification(notificationId);
      const wasUnread = notifications.find(
        (n) => n.id === notificationId && !n.read,
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  const hasMore = notifications.length === PAGE_SIZE;

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-1.5 rounded-xl"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setFilterUnreadOnly(!filterUnreadOnly);
              setPage(0);
            }}
            className={cn(
              "text-sm px-3 py-2 rounded-xl border transition-colors",
              filterUnreadOnly
                ? "bg-primary-50 border-primary-300 text-primary-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            Apenas não lidas
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Bell className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs mt-1">
                {filterType || filterUnreadOnly
                  ? "Tente remover os filtros"
                  : "Você será notificado sobre atualizações importantes"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "relative px-4 py-4 hover:bg-gray-50 transition-colors group",
                    !notification.read && "bg-primary-50/40",
                  )}
                >
                  <div className="flex gap-3">
                    <span className="text-lg mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            if (!notification.read) {
                              handleMarkAsRead(notification.id);
                            }
                          }}
                          className="block"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">
                            {notification.message}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">
                            {notification.message}
                          </p>
                        </>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true, locale: ptBR },
                          )}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {!notification.read && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && (notifications.length > 0 || page > 0) && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="gap-1 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="text-xs text-gray-500">Página {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 rounded-xl"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
