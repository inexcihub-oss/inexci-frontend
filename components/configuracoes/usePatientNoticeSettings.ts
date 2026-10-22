import { useCallback, useEffect, useState } from "react";
import type { ToastType } from "@/types/toast.types";
import {
  notificationService,
  type PatientNotificationSettings,
} from "@/services/notification.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";

export function usePatientNoticeSettings({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notices, setNotices] = useState<PatientNotificationSettings | null>(
    null,
  );

  const load = useCallback(() => {
    let ativo = true;
    setLoading(true);
    setLoadError(false);
    notificationService
      .getPatientSettings()
      .then((settings) => {
        if (ativo) setNotices(settings);
      })
      .catch((error) => {
        logger.error("Erro ao carregar avisos aos pacientes:", error);
        if (ativo) setLoadError(true);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const handleSave = async () => {
    if (!notices) return;
    setSaving(true);
    try {
      setNotices(await notificationService.updatePatientSettings(notices));
      showToast("Avisos aos pacientes atualizados!", "success");
    } catch (error: unknown) {
      showToast(
        getApiErrorMessage(error, "Erro ao atualizar os avisos aos pacientes"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    loadError,
    saving,
    notices,
    setNotices,
    reload: load,
    handleSave,
  };
}
