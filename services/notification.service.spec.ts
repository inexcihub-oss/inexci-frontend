import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { notificationService } from "./notification.service";

describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUnreadCount", () => {
    it("deve chamar GET /notifications/unread-count", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { count: 5 },
      });

      const result = await notificationService.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith("/notifications/unread-count");
      expect(result).toBe(5);
    });
  });

  describe("markAllAsRead", () => {
    it("deve chamar PUT /notifications/read-all", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await notificationService.markAllAsRead();

      expect(api.put).toHaveBeenCalledWith("/notifications/read-all");
    });
  });

  describe("markAsRead", () => {
    it("deve chamar PUT /notifications/:id/read", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await notificationService.markAsRead(42);

      expect(api.put).toHaveBeenCalledWith("/notifications/42/read");
    });
  });

  describe("getNotifications", () => {
    it("deve chamar GET /notifications com query params", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { notifications: [], unreadCount: 0, total: 0 },
      });

      await notificationService.getNotifications({
        skip: 0,
        take: 10,
        unreadOnly: true,
      });

      expect(api.get).toHaveBeenCalledWith(
        "/notifications?take=10&unreadOnly=true",
      );
    });
  });

  describe("getSettings", () => {
    it("deve chamar GET /notifications/settings", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: 1, email_notifications: true },
      });

      const result = await notificationService.getSettings();

      expect(api.get).toHaveBeenCalledWith("/notifications/settings");
      expect(result.id).toBe(1);
    });
  });

  describe("updateSettings", () => {
    it("deve chamar PUT /notifications/settings", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: 1, email_notifications: false },
      });

      const result = await notificationService.updateSettings({
        email_notifications: false,
      });

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", {
        email_notifications: false,
      });
      expect(result.email_notifications).toBe(false);
    });
  });

  describe("deleteNotification", () => {
    it("deve chamar DELETE /notifications/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await notificationService.deleteNotification(10);

      expect(api.delete).toHaveBeenCalledWith("/notifications/10");
    });
  });
});
