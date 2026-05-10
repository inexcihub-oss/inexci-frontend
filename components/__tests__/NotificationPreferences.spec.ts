import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes da camada de preferências de notificação.
 *
 * Validam:
 *  - Que o estado local da tela usa exatamente o mesmo formato camelCase
 *    devolvido/aceito pelo backend (sem mapeamento snake_case ⇄ camelCase).
 *  - Que canais removidos (SMS, e-mail genérico) não são expostos.
 *  - Que para usuários do sistema os canais ativos são apenas push (in-app)
 *    e WhatsApp; o único e-mail enviado é o resumo semanal, controlado por
 *    `weeklyReport`.
 */

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { notificationService } from "@/services/notification.service";

interface NotificationSettings {
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
}

describe("Preferências de Notificação — integração com a API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApiSettings = {
    id: "settings-1",
    userId: "user-1",
    pushNotifications: true,
    whatsappNotifications: true,
    newSurgeryRequest: true,
    statusUpdate: true,
    pendencies: true,
    expiringDocuments: false,
    weeklyReport: false,
  };

  describe("getSettings", () => {
    it("retorna os dados em camelCase, prontos para o estado local", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const settings = await notificationService.getSettings();

      expect(settings.whatsappNotifications).toBe(true);
      expect(settings.pushNotifications).toBe(true);
      expect(settings.expiringDocuments).toBe(false);
      expect(settings.weeklyReport).toBe(false);
    });

    it("não expõe canais removidos (SMS, e-mail genérico)", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const settings = await notificationService.getSettings();

      expect((settings as unknown as Record<string, unknown>).smsNotifications).toBe(
        undefined,
      );
      expect((settings as unknown as Record<string, unknown>).sms_notifications).toBe(
        undefined,
      );
      expect((settings as unknown as Record<string, unknown>).emailNotifications).toBe(
        undefined,
      );
    });
  });

  describe("updateSettings", () => {
    it("envia o payload em camelCase exatamente como o backend espera", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const local: NotificationSettings = {
        pushNotifications: false,
        whatsappNotifications: false,
        newSurgeryRequest: true,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: true,
        weeklyReport: false,
      };

      await notificationService.updateSettings(local);

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", local);
    });

    it("toggle individual de WhatsApp preserva os demais campos", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      const local: NotificationSettings = {
        pushNotifications: true,
        whatsappNotifications: true,
        newSurgeryRequest: true,
        statusUpdate: true,
        pendencies: true,
        expiringDocuments: true,
        weeklyReport: false,
      };

      const updated = { ...local, whatsappNotifications: false };
      await notificationService.updateSettings(updated);

      const callArg = (api.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArg.whatsappNotifications).toBe(false);
      expect(callArg.pushNotifications).toBe(true);
      expect(callArg.weeklyReport).toBe(false);
    });

    it("habilitar resumo semanal envia weeklyReport=true (único e-mail aceito)", async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockApiSettings,
      });

      await notificationService.updateSettings({ weeklyReport: true });

      expect(api.put).toHaveBeenCalledWith("/notifications/settings", {
        weeklyReport: true,
      });
    });
  });
});
