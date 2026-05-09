import api from "@/lib/api";

export interface NotificationSettings {
  id: string;
  userId: string;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
}

export interface UpdateNotificationSettingsData {
  pushNotifications?: boolean;
  whatsappNotifications?: boolean;
  newSurgeryRequest?: boolean;
  statusUpdate?: boolean;
  pendencies?: boolean;
  expiringDocuments?: boolean;
  weeklyReport?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export const notificationService = {
  // ============ Settings ============

  /**
   * Busca as configurações de notificação do usuário
   */
  async getSettings(): Promise<NotificationSettings> {
    const response = await api.get<NotificationSettings>(
      "/notifications/settings",
    );
    return response.data;
  },

  /**
   * Atualiza as configurações de notificação
   */
  async updateSettings(
    data: UpdateNotificationSettingsData,
  ): Promise<NotificationSettings> {
    const response = await api.put<NotificationSettings>(
      "/notifications/settings",
      data,
    );
    return response.data;
  },

  // ============ Notifications ============

  /**
   * Busca as notificações do usuário
   */
  async getNotifications(options?: {
    skip?: number;
    take?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (options?.skip) params.append("skip", options.skip.toString());
    if (options?.take) params.append("take", options.take.toString());
    if (options?.unreadOnly) params.append("unreadOnly", "true");

    const response = await api.get<NotificationsResponse>(
      `/notifications?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Busca a quantidade de notificações não lidas
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>(
      "/notifications/unread-count",
    );
    return response.data.count;
  },

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(): Promise<void> {
    await api.put("/notifications/read-all");
  },

  /**
   * Remove uma notificação
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },
};
