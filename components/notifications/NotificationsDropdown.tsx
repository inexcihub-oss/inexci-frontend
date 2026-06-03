"use client";

import { useState, useRef } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";
import { useClickOutside } from "@/hooks";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { logger } from "@/lib/logger";
import NotificationActorAvatar from "@/components/notifications/NotificationActorAvatar";

interface NotificationsDropdownProps {
  isCollapsed?: boolean;
}

export default function NotificationsDropdown({
  isCollapsed = false,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { unreadCount, setUnreadCount } = useNotifications();

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  // Carregar notificações quando abrir o dropdown
  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLoading(true);
      try {
        const response = await notificationService.getNotifications({
          take: 10,
        });
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
      } catch (error) {
        logger.error("Erro ao carregar notificações:", error);
      } finally {
        setLoading(false);
      }
    }
  };

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
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      logger.error("Erro ao remover notificação:", error);
    }
  };

  const normalizeNotificationLink = (link: string): string => {
    return link.replace(/\/solicitac[^\\/]*\//, "/solicitacao/");
  };

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

  const renderNotificationIndicator = (notification: Notification) => {
    if (notification.type === "action_by_user") {
      const actor = getActorMetadata(notification);
      if (actor) {
        return (
          <NotificationActorAvatar
            actorId={actor.actorId}
            actorName={actor.actorName}
            actorAvatarUrl={actor.actorAvatarUrl}
          />
        );
      }
    }

    return (
      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
    );
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          "relative flex w-full items-center gap-3 px-3 py-3 rounded-xl opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-all min-h-[44px]",
          isCollapsed ? "justify-center" : "",
        )}
        title={isCollapsed ? "Notificações" : undefined}
      >
        <span className="relative inline-flex shrink-0">
          <Bell className="w-5 h-5 text-neutral-900" />
          {unreadCount > 0 && (
            <span className="hidden lg:flex absolute -top-1 -right-2 items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        {!isCollapsed && (
          <span className="text-xs md:text-sm font-semibold text-neutral-900">
            Notificações
          </span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full lg:hidden">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-[200]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative px-4 py-3 hover:bg-gray-50 transition-colors",
                      !notification.read && "bg-primary-50/50",
                    )}
                  >
                    <div className="flex gap-3">
                      {renderNotificationIndicator(notification)}
                      <div className="flex-1 min-w-0">
                        {notification.link ? (
                          <Link
                            href={normalizeNotificationLink(notification.link)}
                            onClick={() => {
                              if (!notification.read) {
                                handleMarkAsRead(notification.id);
                              }
                              setIsOpen(false);
                            }}
                            className="block"
                          >
                            <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </Link>
                        ) : (
                          <>
                            <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                              locale: ptBR,
                            },
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 active:scale-[0.95] transition-all"
                            title="Marcar como lida"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 active:scale-[0.95] transition-all"
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

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 flex justify-between">
              <Link
                href="/notificacoes"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Ver todas as notificações
              </Link>
              <Link
                href="/configuracoes"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Configurações
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
