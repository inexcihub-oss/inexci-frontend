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

      await notificationService.markAsRead("notif-42");

      expect(api.put).toHaveBeenCalledWith("/notifications/notif-42/read");
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
    it("deve chamar GET /notifications/settings e devolver dados em camelCase", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          id: "settings-1",
          userId: "user-1",
          pushNotifications: true,
          whatsappNotifications: true,
          newSurgeryRequest: true,
          statusUpdate: true,
          pendencies: true,
          expiringDocuments: true,
          weeklyReport: false,
        },
      });

      const result = await notificationService.getSettings();

      expect(api.get).toHaveBeenCalledWith("/notifications/settings");
      expect(result.pushNotifications).toBe(true);
      expect(result.weeklyReport).toBe(false);
    });
  });

  describe("updateSettings", () => {
    it("envia payload em camelCase (sem snake_case)", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "settings-1", pushNotifications: false },
      });

      const result = await notificationService.updateSettings({
        pushNotifications: false,
      });

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", {
        pushNotifications: false,
      });
      expect(result.pushNotifications).toBe(false);
    });

    it("propaga todos os toggles em camelCase", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

      await notificationService.updateSettings({
        pushNotifications: false,
        whatsappNotifications: true,
        newSurgeryRequest: false,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: false,
        weeklyReport: true,
      });

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", {
        pushNotifications: false,
        whatsappNotifications: true,
        newSurgeryRequest: false,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: false,
        weeklyReport: true,
      });
    });
  });

  describe("deleteNotification", () => {
    it("deve chamar DELETE /notifications/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await notificationService.deleteNotification("notif-10");

      expect(api.delete).toHaveBeenCalledWith("/notifications/notif-10");
    });
  });
});
