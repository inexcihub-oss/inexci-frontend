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
  mentionEmails: boolean;
}

export interface UpdateNotificationSettingsData {
  pushNotifications?: boolean;
  whatsappNotifications?: boolean;
  newSurgeryRequest?: boolean;
  statusUpdate?: boolean;
  pendencies?: boolean;
  expiringDocuments?: boolean;
  weeklyReport?: boolean;
  mentionEmails?: boolean;
}

export interface PatientNotificationSettings {
  appointmentScheduled: boolean;
  appointmentReminder: boolean;
  appointmentCancelled: boolean;
}

export interface NotificationMetadata {
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  category?: string;
  jobId?: string;
  status?: "processing" | "done" | "error" | string;
  documentName?: string;
  fileName?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: NotificationMetadata;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export const notificationService = {
  async getSettings(): Promise<NotificationSettings> {
    const response = await api.get<NotificationSettings>(
      "/notifications/settings",
    );
    return response.data;
  },

  async updateSettings(
    data: UpdateNotificationSettingsData,
  ): Promise<NotificationSettings> {
    const response = await api.put<NotificationSettings>(
      "/notifications/settings",
      data,
    );
    return response.data;
  },

  async getPatientSettings(): Promise<PatientNotificationSettings> {
    const response = await api.get<PatientNotificationSettings>(
      "/notifications/patient-settings",
    );
    return response.data;
  },

  async updatePatientSettings(
    data: Partial<PatientNotificationSettings>,
  ): Promise<PatientNotificationSettings> {
    const response = await api.put<PatientNotificationSettings>(
      "/notifications/patient-settings",
      data,
    );
    return response.data;
  },

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

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put("/notifications/read-all");
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },
};
