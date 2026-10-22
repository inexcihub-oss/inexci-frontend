"use client";

import { Bell, Check, CheckCheck, Loader2, Settings2, X } from "lucide-react";
import Link from "next/link";
import NotificationIcon from "@/components/notifications/NotificationIcon";
import NotificationTime from "@/components/notifications/NotificationTime";
import { cn } from "@/lib/utils";
import {
  cleanNotificationTitle,
  getNotificationDocumentName,
  normalizeNotificationLink,
} from "@/lib/notifications";
import { clearDocumentExtractionCacheIfNeeded } from "@/hooks/useNotificationsFeed";
import type { Notification } from "@/services/notification.service";

interface NotificationsPanelProps {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onDelete: (notification: Notification) => void;
  onClose: () => void;
  className?: string;
}

export default function NotificationsPanel({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  className,
}: NotificationsPanelProps) {
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  const renderContent = (notification: Notification) => {
    const documentName = getNotificationDocumentName(notification);
    return (
      <>
        <p
          className={cn(
            "text-sm leading-snug line-clamp-1",
            notification.read
              ? "font-normal text-gray-600"
              : "font-medium text-gray-900",
          )}
        >
          {cleanNotificationTitle(notification.title)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 line-clamp-2">
          {notification.message}
        </p>
        {documentName && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            Documento: {documentName}
          </p>
        )}
        <NotificationTime
          createdAt={notification.createdAt}
          className="mt-1 block text-[11px] text-gray-400 tabular-nums"
        />
      </>
    );
  };

  return (
    <div
      role="dialog"
      aria-label="Notificações"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg",
        className,
      )}
    >
      <div className="border-b border-gray-100 px-4 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            Notificações
          </h2>
          <Link
            href="/configuracoes?tab=notifications"
            onClick={onClose}
            aria-label="Preferências de notificação"
            title="Preferências de notificação"
            className="-mr-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </Link>
        </div>
        <div className="mt-0.5 flex min-h-[28px] items-center justify-between gap-2">
          <p className="text-xs text-gray-500 whitespace-nowrap">
            {unreadCount > 0
              ? `${badge} ${unreadCount === 1 ? "não lida" : "não lidas"}`
              : "Tudo em dia"}
          </p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="-mr-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-1.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain p-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
            <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
              <Bell className="w-5 h-5 text-gray-400" />
            </span>
            <p className="text-sm font-medium text-gray-700">
              Nenhuma notificação
            </p>
            <p className="text-xs text-gray-500">
              Avisaremos aqui quando houver novidades.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="group relative flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <NotificationIcon notification={notification} />
                <div className="flex-1 min-w-0">
                  {notification.link ? (
                    <Link
                      href={normalizeNotificationLink(notification.link)}
                      onClick={() => {
                        clearDocumentExtractionCacheIfNeeded(notification);
                        if (!notification.read) onMarkAsRead(notification);
                        onClose();
                      }}
                      className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {renderContent(notification)}
                    </Link>
                  ) : (
                    renderContent(notification)
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-0.5">
                  {!notification.read && (
                    <span
                      aria-label="Não lida"
                      className="mt-1.5 mr-1 h-2 w-2 rounded-full bg-primary-500 lg:group-hover:hidden lg:group-focus-within:hidden"
                    />
                  )}
                  <div className="flex gap-0.5 lg:hidden lg:group-hover:flex lg:group-focus-within:flex">
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notification)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(notification)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remover"
                      aria-label="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        <Link
          href="/notificacoes"
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-xl py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
        >
          Ver todas as notificações
        </Link>
      </div>
    </div>
  );
}
