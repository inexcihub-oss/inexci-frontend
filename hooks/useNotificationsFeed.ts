import { useCallback, useState } from "react";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";
import { useNotifications } from "@/hooks/useNotifications";
import { isDocumentExtractionNotification } from "@/lib/notifications";
import { clearScFromDocumentStorage } from "@/lib/sc-from-document-background";
import { logger } from "@/lib/logger";

export function clearDocumentExtractionCacheIfNeeded(
  notification: Notification,
) {
  if (isDocumentExtractionNotification(notification)) {
    clearScFromDocumentStorage();
  }
}

export function useNotificationsFeed(take = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, setUnreadCount } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({ take });
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      logger.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  }, [take, setUnreadCount]);

  const markAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      clearDocumentExtractionCacheIfNeeded(notification);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      if (notifications.some(isDocumentExtractionNotification)) {
        clearScFromDocumentStorage();
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const remove = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification.id);
      clearDocumentExtractionCacheIfNeeded(notification);
      const wasUnread = notifications.some(
        (n) => n.id === notification.id && !n.read,
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Erro ao remover notificação:", error);
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    load,
    markAsRead,
    markAllAsRead,
    remove,
  };
}
