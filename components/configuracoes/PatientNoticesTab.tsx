"use client";

import { BellRing, CalendarCheck, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { ToastType } from "@/types/toast.types";
import {
  NotificationItem,
  SettingsGroup,
  TabLoading,
} from "./SettingsControls";
import { usePatientNoticeSettings } from "./usePatientNoticeSettings";

export function PatientNoticesTab({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const {
    loading,
    loadError,
    saving,
    notices,
    setNotices,
    reload,
    handleSave,
  } = usePatientNoticeSettings({ showToast });

  if (loading) return <TabLoading />;

  if (loadError || !notices) {
    return (
      <Card className="border border-gray-200 rounded-2xl">
        <CardContent className="p-6 flex flex-col items-start gap-3">
          <p className="text-sm text-gray-600">
            Não foi possível carregar os avisos aos pacientes.
          </p>
          <Button
            variant="outline"
            onClick={reload}
            className="min-h-[44px] rounded-xl"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsGroup
        title="Avisos aos pacientes"
        description="Mensagens automáticas enviadas aos pacientes. Vale para toda a clínica."
      >
        <NotificationItem
          icon={CalendarCheck}
          title="Consulta agendada"
          description="WhatsApp ao paciente quando a consulta é marcada, remarcada ou reativada."
          checked={notices.appointmentScheduled}
          onChange={(checked) =>
            setNotices({ ...notices, appointmentScheduled: checked })
          }
        />
        <NotificationItem
          icon={BellRing}
          title="Lembrete e confirmação de consulta"
          description="E-mail e WhatsApp 24 horas antes, com as opções de confirmar ou cancelar."
          checked={notices.appointmentReminder}
          onChange={(checked) =>
            setNotices({ ...notices, appointmentReminder: checked })
          }
        />
        <NotificationItem
          icon={CalendarX}
          title="Consulta cancelada"
          description="WhatsApp ao paciente quando a consulta é cancelada."
          checked={notices.appointmentCancelled}
          onChange={(checked) =>
            setNotices({ ...notices, appointmentCancelled: checked })
          }
        />
      </SettingsGroup>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          isLoading={saving}
          className="min-h-[44px] rounded-xl"
        >
          Salvar avisos
        </Button>
      </div>
    </div>
  );
}
