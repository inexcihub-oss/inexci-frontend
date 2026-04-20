"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Settings, X, Check, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";
import { uploadService } from "@/services/upload.service";
import { useAuth } from "@/contexts/AuthContext";
import { useClickOutside } from "@/hooks";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MobileHeaderActions() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    dropdownRef,
    () => setIsNotificationsOpen(false),
    isNotificationsOpen,
  );
  useClickOutside(userMenuRef, () => setIsUserMenuOpen(false), isUserMenuOpen);

  // Fetch fresh user data (ensures avatar_url is available)
  useEffect(() => {
    updateUser().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve avatar URL
  useEffect(() => {
    const raw = user?.avatar_url;
    if (!raw) {
      setAvatarUrl(null);
      return;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      setAvatarUrl(raw);
    } else {
      uploadService
        .getSignedUrl(raw)
        .then(setAvatarUrl)
        .catch(() => setAvatarUrl(null));
    }
  }, [user?.avatar_url]);

  // Close on navigation
  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  // Load unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error("Erro ao carregar contagem de notificações:", error);
      }
    };

    loadUnreadCount();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadUnreadCount();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadUnreadCount();
    }, 120000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleOpenNotifications = async () => {
    const opening = !isNotificationsOpen;
    setIsNotificationsOpen(opening);
    if (opening) {
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
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
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
      case "action_by_user":
        return "👤";
      case "stale":
        return "⏰";
      default:
        return "ℹ️";
    }
  };

  const isSettingsActive = pathname === "/configuracoes";

  return (
    <div className="flex items-center gap-1">
      {/* Notifications Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleOpenNotifications}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
            isNotificationsOpen
              ? "bg-primary-50 text-primary-600"
              : "text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100",
          )}
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown - Compact popover */}
        {isNotificationsOpen && (
          <>
            {/* Invisible backdrop to close */}
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => setIsNotificationsOpen(false)}
            />

            {/* Dropdown card */}
            <div className="fixed top-14 right-4 left-4 max-w-sm ml-auto z-[90] bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-scale-in origin-top-right">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Notificações
                </h2>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors px-2 py-0.5 rounded-md hover:bg-primary-50"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                    <Bell className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Nenhuma notificação</p>
                    <p className="text-xs mt-0.5">Você está em dia!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors",
                          !notification.read ? "bg-primary-50/30" : "",
                        )}
                      >
                        <span className="text-base mt-0.5 shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-[13px] leading-snug",
                              !notification.read
                                ? "font-semibold text-neutral-900"
                                : "text-neutral-600",
                            )}
                          >
                            {notification.message}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              },
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 transition-colors"
                              title="Marcar como lida"
                            >
                              <Check className="w-3.5 h-3.5 text-primary-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-neutral-100 px-4 py-2.5">
                  <Link
                    href="/notificacoes"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="block text-center text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Ver todas
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings Button */}
      <Link
        href="/configuracoes"
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
          isSettingsActive
            ? "bg-primary-50 text-primary-600"
            : "text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100",
        )}
        aria-label="Configurações"
      >
        <Settings className="w-5 h-5" strokeWidth={1.8} />
      </Link>

      {/* User Avatar */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen((v) => !v)}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden transition-all duration-200 ring-2 ring-transparent hover:ring-neutral-200 active:ring-primary-200"
          aria-label="Menu do usuário"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={user?.name || "Avatar"}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-xs font-semibold",
                getAvatarColor(user?.name || "User"),
              )}
            >
              {getInitials(user?.name || "User")}
            </div>
          )}
        </button>

        {/* User Menu Popover */}
        {isUserMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => setIsUserMenuOpen(false)}
            />
            <div className="fixed top-14 right-4 w-48 z-[90] bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-scale-in origin-top-right">
              {/* User info */}
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {user?.name || "Usuário"}
                </p>
                {user?.email && (
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>
              {/* Logout */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group"
              >
                <LogOut className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
                <span className="text-sm text-neutral-700 group-hover:text-red-600 transition-colors">
                  Sair
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
