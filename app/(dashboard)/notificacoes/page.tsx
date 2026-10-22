"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  notificationService,
  Notification,
  NotificationsResponse,
} from "@/services/notification.service";
import { cn } from "@/lib/utils";
import { registryKeys } from "@/lib/query-keys";
import { parseApiDate } from "@/lib/formatters";
import {
  cleanNotificationTitle,
  daysBetween,
  getNotificationDocumentName,
  getNotificationFilter,
  getNotificationMeta,
  isDocumentExtractionNotification,
  normalizeNotificationLink,
  NOTIFICATION_FILTERS,
} from "@/lib/notifications";
import PageContainer from "@/components/PageContainer";
import Button from "@/components/ui/Button";
import NotificationIcon from "@/components/notifications/NotificationIcon";
import NotificationTime from "@/components/notifications/NotificationTime";
import { clearScFromDocumentStorage } from "@/lib/sc-from-document-background";

const PAGE_SIZE = 20;
function getDayGroup(createdAt: string, now = new Date()): string {
  const date = parseApiDate(createdAt);
  if (Number.isNaN(date.getTime())) return "Mais antigas";
  const diffDays = daysBetween(date, now);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return "Últimos 7 dias";
  if (diffDays < 30) return "Últimos 30 dias";
  return "Mais antigas";
}

function groupByDay(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  for (const notification of notifications) {
    const label = getDayGroup(notification.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(notification);
    else groups.push({ label, items: [notification] });
  }
  return groups;
}

export default function NotificacoesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const queryKey = [
    ...registryKeys.notifications(),
    "page",
    page,
    filterUnreadOnly,
  ] as const;
  const { data, isPending: loading } = useQuery({
    queryKey,
    queryFn: () =>
      notificationService.getNotifications({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        unreadOnly: filterUnreadOnly || undefined,
      }),
  });
  const unreadCount = data?.unreadCount ?? 0;
  const pageItems = data?.notifications;
  const notifications = useMemo(() => {
    const all = pageItems ?? [];
    return filterType
      ? all.filter((n) => getNotificationFilter(n) === filterType)
      : all;
  }, [pageItems, filterType]);
  const groups = useMemo(() => groupByDay(notifications), [notifications]);

  const clearDocumentExtractionCacheIfNeeded = (notification: Notification) => {
    if (isDocumentExtractionNotification(notification)) {
      clearScFromDocumentStorage();
    }
  };

  const updatePage = (
    change: (prev: NotificationsResponse) => NotificationsResponse,
  ) =>
    queryClient.setQueryData<NotificationsResponse>(queryKey, (prev) =>
      prev ? change(prev) : prev,
    );

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      clearDocumentExtractionCacheIfNeeded(notification);
      updatePage((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      logger.error("Erro ao marcar como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      if (notifications.some(isDocumentExtractionNotification)) {
        clearScFromDocumentStorage();
      }
      updatePage((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      logger.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification.id);
      clearDocumentExtractionCacheIfNeeded(notification);
      const wasUnread = notifications.find(
        (n) => n.id === notification.id && !n.read,
      );
      updatePage((prev) => ({
        ...prev,
        notifications: prev.notifications.filter(
          (n) => n.id !== notification.id,
        ),
        unreadCount: wasUnread
          ? Math.max(0, prev.unreadCount - 1)
          : prev.unreadCount,
      }));
    } catch (error) {
      logger.error("Erro ao remover notificação:", error);
    }
  };

  const hasMore = (pageItems?.length ?? 0) === PAGE_SIZE;
  const hasFilters = !!filterType || filterUnreadOnly;

  const renderContent = (notification: Notification) => {
    const meta = getNotificationMeta(notification);
    const documentName = getNotificationDocumentName(notification);
    return (
      <>
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "flex-1 min-w-0 text-sm leading-snug",
              notification.read
                ? "font-normal text-gray-600"
                : "font-semibold text-gray-900",
            )}
          >
            {cleanNotificationTitle(notification.title)}
          </p>
          <NotificationTime
            createdAt={notification.createdAt}
            className="shrink-0 text-xs text-gray-400 tabular-nums lg:hidden"
          />
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-500 line-clamp-2 lg:line-clamp-1">
          {notification.message}
        </p>
        {documentName && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            Documento: {documentName}
          </p>
        )}
        <span
          className={cn(
            "mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium lg:hidden",
            meta.chip,
          )}
        >
          {meta.label}
        </span>
      </>
    );
  };

  return (
    <PageContainer className="border-gray-200">
      <div className="flex-none flex items-center justify-between gap-3 px-4 lg:px-8 py-3 lg:py-4 border-b border-gray-200">
        <div className="min-w-0">
          <h1 className="ds-page-title">Notificações</h1>
          <p className="ds-caption mt-0.5">
            {unreadCount > 0
              ? `${unreadCount > 99 ? "99+" : unreadCount} ${
                  unreadCount === 1 ? "não lida" : "não lidas"
                }`
              : "Tudo em dia"}
          </p>
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

      <div className="flex-none flex flex-wrap items-center gap-2 px-4 lg:px-8 py-3 border-b border-gray-100">
        <div
          role="group"
          aria-label="Status de leitura"
          className="inline-flex rounded-xl bg-gray-100 p-1"
        >
          {[
            { value: false, label: "Todas" },
            { value: true, label: "Não lidas" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={filterUnreadOnly === option.value}
              onClick={() => {
                setFilterUnreadOnly(option.value);
                setPage(0);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filterUnreadOnly === option.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <select
          aria-label="Filtrar por tipo"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(0);
          }}
          className="ds-input flex-1 sm:flex-none sm:w-60"
        >
          {NOTIFICATION_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-20 px-6 text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              {hasFilters ? (
                <BellOff className="w-6 h-6 text-gray-400" />
              ) : (
                <Bell className="w-6 h-6 text-gray-400" />
              )}
            </span>
            <p className="text-sm font-medium text-gray-700">
              Nenhuma notificação
            </p>
            <p className="ds-caption max-w-xs">
              {hasFilters
                ? "Tente remover os filtros para ver todas as notificações"
                : "Você será notificado sobre atualizações importantes da plataforma"}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-4 lg:px-8 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {group.label}
              </h2>
              <ul className="divide-y divide-gray-100">
                {group.items.map((notification) => {
                  const meta = getNotificationMeta(notification);
                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "group relative flex items-start lg:items-center gap-3 lg:gap-4 px-4 lg:px-8 py-3.5 transition-colors hover:bg-gray-50",
                        !notification.read && "bg-primary-50/30",
                      )}
                    >
                      {!notification.read && (
                        <span
                          aria-label="Não lida"
                          className="absolute left-1.5 lg:left-3.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary-500"
                        />
                      )}
                      <NotificationIcon notification={notification} size="md" />
                      <div className="flex-1 min-w-0">
                        {notification.link ? (
                          <Link
                            href={normalizeNotificationLink(notification.link)}
                            onClick={() => {
                              clearDocumentExtractionCacheIfNeeded(
                                notification,
                              );
                              if (!notification.read)
                                handleMarkAsRead(notification);
                            }}
                            className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {renderContent(notification)}
                          </Link>
                        ) : (
                          renderContent(notification)
                        )}
                      </div>
                      <div className="hidden lg:flex w-44 shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            meta.chip,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <NotificationTime
                        createdAt={notification.createdAt}
                        className="hidden lg:block w-28 shrink-0 text-right text-xs text-gray-400 tabular-nums"
                      />
                      <div className="flex w-[68px] shrink-0 items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                            title="Marcar como lida"
                            aria-label="Marcar como lida"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remover"
                          aria-label="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {!loading && (hasMore || page > 0) && (
        <div className="flex-none flex items-center justify-between px-4 lg:px-8 py-3 border-t border-gray-200">
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
