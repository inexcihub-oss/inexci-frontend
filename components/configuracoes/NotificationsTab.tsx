"use client";

import {
  Bell,
  BellRing,
  CalendarCheck,
  CalendarX,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { NotificationItem, TabLoading } from "./SettingsControls";
import type { NotificationSettingsState } from "./useNotificationSettings";

export function NotificationsTab({
  settings,
}: {
  settings: NotificationSettingsState;
}) {
  const {
    loadingNotifications,
    saving,
    notifications,
    setNotifications,
    patientNotifications,
    setPatientNotifications,
    podeAdministrar,
    handleSaveNotifications,
  } = settings;

  if (loadingNotifications) return <TabLoading />;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Canais de Notificação
          </h3>
          <p className="text-sm text-gray-500">
            Escolha como deseja receber as notificações
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <NotificationItem
            icon={Bell}
            title="Notificações na plataforma"
            description="Receba alertas em tempo real dentro da plataforma"
            checked={notifications.pushNotifications}
            onChange={(checked) =>
              setNotifications({
                ...notifications,
                pushNotifications: checked,
              })
            }
          />
          <NotificationItem
            icon={MessageSquare}
            title="Notificações por WhatsApp"
            description="Receba alertas importantes via WhatsApp"
            checked={notifications.whatsappNotifications}
            onChange={(checked) =>
              setNotifications({
                ...notifications,
                whatsappNotifications: checked,
              })
            }
          />
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Tipos de Notificação
          </h3>
          <p className="text-sm text-gray-500">
            Personalize quais notificações deseja receber
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <NotificationItem
            icon={MessageSquare}
            title="Novas Solicitações"
            description="Quando uma nova solicitação cirúrgica for criada"
            checked={notifications.newSurgeryRequest}
            onChange={(checked) =>
              setNotifications({
                ...notifications,
                newSurgeryRequest: checked,
              })
            }
          />
          <NotificationItem
            icon={Bell}
            title="Atualizações de Status"
            description="Quando o status de uma solicitação for alterado"
            checked={notifications.statusUpdate}
            onChange={(checked) =>
              setNotifications({ ...notifications, statusUpdate: checked })
            }
          />
          <NotificationItem
            icon={Bell}
            title="Pendências"
            description="Quando houver pendências a serem resolvidas"
            checked={notifications.pendencies}
            onChange={(checked) =>
              setNotifications({ ...notifications, pendencies: checked })
            }
          />
          <NotificationItem
            icon={Bell}
            title="Documentos Expirando"
            description="Quando documentos estiverem próximos do vencimento"
            checked={notifications.expiringDocuments}
            onChange={(checked) =>
              setNotifications({
                ...notifications,
                expiringDocuments: checked,
              })
            }
          />
          <NotificationItem
            icon={Mail}
            title="Resumo semanal por e-mail"
            description="Receba toda segunda-feira um e-mail com o resumo das suas solicitações cirúrgicas"
            checked={notifications.weeklyReport}
            onChange={(checked) =>
              setNotifications({ ...notifications, weeklyReport: checked })
            }
          />
          <NotificationItem
            icon={Mail}
            title="Menções por e-mail"
            description="Receba um e-mail quando alguém mencionar você num comentário e a notificação não for lida em 10 minutos"
            checked={notifications.mentionEmails}
            onChange={(checked) =>
              setNotifications({ ...notifications, mentionEmails: checked })
            }
          />
        </CardContent>
      </Card>

      {podeAdministrar && patientNotifications && (
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Avisos aos pacientes
            </h3>
            <p className="text-sm text-gray-500">
              Mensagens automáticas enviadas aos pacientes. Vale para toda a
              clínica.
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <NotificationItem
              icon={CalendarCheck}
              title="Consulta agendada"
              description="WhatsApp ao paciente quando a consulta é marcada, remarcada ou reativada"
              checked={patientNotifications.appointmentScheduled}
              onChange={(checked) =>
                setPatientNotifications({
                  ...patientNotifications,
                  appointmentScheduled: checked,
                })
              }
            />
            <NotificationItem
              icon={BellRing}
              title="Lembrete e confirmação de consulta"
              description="E-mail e WhatsApp 24 horas antes, com as opções de confirmar ou cancelar"
              checked={patientNotifications.appointmentReminder}
              onChange={(checked) =>
                setPatientNotifications({
                  ...patientNotifications,
                  appointmentReminder: checked,
                })
              }
            />
            <NotificationItem
              icon={CalendarX}
              title="Consulta cancelada"
              description="WhatsApp ao paciente quando a consulta é cancelada"
              checked={patientNotifications.appointmentCancelled}
              onChange={(checked) =>
                setPatientNotifications({
                  ...patientNotifications,
                  appointmentCancelled: checked,
                })
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSaveNotifications}
          isLoading={saving}
          className="min-h-[44px] rounded-xl"
        >
          Salvar Preferências
        </Button>
      </div>
    </div>
  );
}
