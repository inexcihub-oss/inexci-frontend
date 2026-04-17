import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 10.3.2 — Testes de lógica de preferências de notificação.
 *
 * Testa o mapeamento entre o estado local (camelCase) e o payload da API (snake_case),
 * incluindo o campo whatsapp_notifications (INC-02).
 */

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { notificationService } from "@/services/notification.service";

// Simula o mapeamento feito pela página de configurações
interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
}

function mapApiToLocal(
  apiSettings: Record<string, unknown>,
): NotificationSettings {
  return {
    emailNotifications: apiSettings.email_notifications as boolean,
    smsNotifications: apiSettings.sms_notifications as boolean,
    pushNotifications: apiSettings.push_notifications as boolean,
    whatsappNotifications: apiSettings.whatsapp_notifications as boolean,
    newSurgeryRequest: apiSettings.new_surgery_request as boolean,
    statusUpdate: apiSettings.status_update as boolean,
    pendencies: apiSettings.pendencies as boolean,
    expiringDocuments: apiSettings.expiring_documents as boolean,
    weeklyReport: apiSettings.weekly_report as boolean,
  };
}

function mapLocalToApi(local: NotificationSettings) {
  return {
    email_notifications: local.emailNotifications,
    sms_notifications: local.smsNotifications,
    push_notifications: local.pushNotifications,
    whatsapp_notifications: local.whatsappNotifications,
    new_surgery_request: local.newSurgeryRequest,
    status_update: local.statusUpdate,
    pendencies: local.pendencies,
    expiring_documents: local.expiringDocuments,
    weekly_report: local.weeklyReport,
  };
}

describe("Preferências de Notificação — mapeamento e integração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApiSettings = {
    id: 1,
    user_id: 1,
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    whatsapp_notifications: true,
    new_surgery_request: true,
    status_update: true,
    pendencies: true,
    expiring_documents: false,
    weekly_report: false,
  };

  describe("mapApiToLocal", () => {
    it("converte todos os campos snake_case para camelCase", () => {
      const local = mapApiToLocal(mockApiSettings);
      expect(local.emailNotifications).toBe(true);
      expect(local.smsNotifications).toBe(false);
      expect(local.pushNotifications).toBe(true);
      expect(local.whatsappNotifications).toBe(true);
      expect(local.newSurgeryRequest).toBe(true);
      expect(local.statusUpdate).toBe(true);
      expect(local.pendencies).toBe(true);
      expect(local.expiringDocuments).toBe(false);
      expect(local.weeklyReport).toBe(false);
    });

    it("mapeia whatsapp_notifications corretamente (INC-02)", () => {
      const settings = { ...mockApiSettings, whatsapp_notifications: false };
      const local = mapApiToLocal(settings);
      expect(local.whatsappNotifications).toBe(false);
    });
  });

  describe("mapLocalToApi", () => {
    it("converte todos os campos camelCase para snake_case", () => {
      const local: NotificationSettings = {
        emailNotifications: false,
        smsNotifications: true,
        pushNotifications: false,
        whatsappNotifications: true,
        newSurgeryRequest: false,
        statusUpdate: false,
        pendencies: true,
        expiringDocuments: true,
        weeklyReport: true,
      };
      const apiPayload = mapLocalToApi(local);
      expect(apiPayload).toEqual({
        email_notifications: false,
        sms_notifications: true,
        push_notifications: false,
        whatsapp_notifications: true,
        new_surgery_request: false,
        status_update: false,
        pendencies: true,
        expiring_documents: true,
        weekly_report: true,
      });
    });
  });

  describe("integração com notificationService", () => {
    it("getSettings retorna dados da API que podem ser mapeados para local", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const apiResult = await notificationService.getSettings();
      const local = mapApiToLocal(
        apiResult as unknown as Record<string, unknown>,
      );

      expect(local.whatsappNotifications).toBe(true);
      expect(local.emailNotifications).toBe(true);
    });

    it("updateSettings envia payload snake_case correto", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const local: NotificationSettings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        whatsappNotifications: false,
        newSurgeryRequest: true,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: true,
        weeklyReport: false,
      };

      await notificationService.updateSettings(mapLocalToApi(local));

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        whatsapp_notifications: false,
        new_surgery_request: true,
        status_update: true,
        pendencies: true,
        expiring_documents: true,
        weekly_report: false,
      });
    });

    it("toggle individual de canal preserva demais valores", async () => {
      const local: NotificationSettings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        whatsappNotifications: true,
        newSurgeryRequest: true,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: true,
        weeklyReport: false,
      };

      // Simula toggle de WhatsApp off
      const updated = { ...local, whatsappNotifications: false };
      const payload = mapLocalToApi(updated);

      expect(payload.whatsapp_notifications).toBe(false);
      expect(payload.email_notifications).toBe(true); // não mudou
      expect(payload.push_notifications).toBe(true); // não mudou
    });
  });
});
