"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";
import { useClickOutside } from "@/hooks";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface NotificationsDropdownProps {
  isCollapsed?: boolean;
}

export default function NotificationsDropdown({
  isCollapsed = false,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  // Carregar contagem de não lidas periodicamente
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error("Erro ao carregar contagem de notificações:", error);
      }
    };

    // Carregar apenas uma vez ao montar
    loadUnreadCount();

    // Atualizar a contagem apenas quando a aba estiver visível e a cada 2 minutos
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Polling a cada 2 minutos (ao invés de 30 segundos)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadUnreadCount();
      }
    }, 120000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
        console.error("Erro ao carregar notificações:", error);
      } finally {
        setLoading(false);
      }
    }
  };

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
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          "relative flex items-center gap-2 px-2 py-2 rounded-lg opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-colors",
          isCollapsed ? "justify-center" : "",
        )}
        title={isCollapsed ? "Notificações" : undefined}
      >
        <Bell className="w-5 h-5 text-neutral-900" />
        {!isCollapsed && (
          <span className="text-sm font-semibold text-neutral-900">
            Notificações
          </span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
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
                <p className="text-sm">Nenhuma notificação</p>
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
                      <span className="text-lg">
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
                              setIsOpen(false);
                            }}
                            className="block"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </Link>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
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
                            className="p-1 text-gray-400 hover:text-primary-600 rounded"
                            title="Marcar como lida"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
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
            <div className="px-4 py-2 border-t border-gray-100">
              <Link
                href="/configuracoes"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Ver configurações de notificações
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
