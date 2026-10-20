import { useEffect, useState } from "react";
import type { ToastType } from "@/types/toast.types";
import {
  notificationService,
  type PatientNotificationSettings,
} from "@/services/notification.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";

export interface NotificationSettings {
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newSurgeryRequest: boolean;
  statusUpdate: boolean;
  pendencies: boolean;
  expiringDocuments: boolean;
  weeklyReport: boolean;
  mentionEmails: boolean;
}

export function useNotificationSettings({
  podeAdministrar,
  showToast,
}: {
  podeAdministrar: boolean;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    whatsappNotifications: true,
    newSurgeryRequest: true,
    statusUpdate: true,
    pendencies: true,
    expiringDocuments: true,
    weeklyReport: false,
    mentionEmails: true,
  });
  const [patientNotifications, setPatientNotifications] =
    useState<PatientNotificationSettings | null>(null);

  useEffect(() => {
    if (!podeAdministrar) {
      setPatientNotifications(null);
      return;
    }
    let ativo = true;
    notificationService
      .getPatientSettings()
      .then((settings) => {
        if (ativo) setPatientNotifications(settings);
      })
      .catch((error) => {
        logger.error("Erro ao carregar avisos aos pacientes:", error);
      });
    return () => {
      ativo = false;
    };
  }, [podeAdministrar]);

  useEffect(() => {
    const loadNotificationSettings = async () => {
      setLoadingNotifications(true);
      try {
        const settings = await notificationService.getSettings();
        setNotifications({
          pushNotifications: settings.pushNotifications,
          whatsappNotifications: settings.whatsappNotifications,
          newSurgeryRequest: settings.newSurgeryRequest,
          statusUpdate: settings.statusUpdate,
          pendencies: settings.pendencies,
          expiringDocuments: settings.expiringDocuments,
          weeklyReport: settings.weeklyReport,
          mentionEmails: settings.mentionEmails ?? true,
        });
      } catch (error) {
        logger.error("Erro ao carregar configurações de notificação:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotificationSettings();
  }, []);

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await notificationService.updateSettings({
        pushNotifications: notifications.pushNotifications,
        whatsappNotifications: notifications.whatsappNotifications,
        newSurgeryRequest: notifications.newSurgeryRequest,
        statusUpdate: notifications.statusUpdate,
        pendencies: notifications.pendencies,
        expiringDocuments: notifications.expiringDocuments,
        weeklyReport: notifications.weeklyReport,
        mentionEmails: notifications.mentionEmails,
      });
      if (podeAdministrar && patientNotifications) {
        setPatientNotifications(
          await notificationService.updatePatientSettings(patientNotifications),
        );
      }
      showToast("Configurações de notificação atualizadas!", "success");
    } catch (error: unknown) {
      showToast(
        getApiErrorMessage(error, "Erro ao atualizar configurações"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    loadingNotifications,
    saving,
    notifications,
    setNotifications,
    patientNotifications,
    setPatientNotifications,
    podeAdministrar,
    handleSaveNotifications,
  };
}

export type NotificationSettingsState = ReturnType<
  typeof useNotificationSettings
>;
