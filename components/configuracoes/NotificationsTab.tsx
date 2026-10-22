"use client";

import {
  AtSign,
  Bell,
  CalendarRange,
  CircleAlert,
  FileClock,
  FilePlus2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  NotificationItem,
  SettingsGroup,
  TabLoading,
} from "./SettingsControls";
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
    handleSaveNotifications,
  } = settings;

  if (loadingNotifications) return <TabLoading />;

  const alternar = (campo: keyof typeof notifications) => (checked: boolean) =>
    setNotifications({ ...notifications, [campo]: checked });

  return (
    <div className="space-y-6">
      <SettingsGroup
        title="Onde receber"
        description="Os canais por onde chegam os seus avisos."
      >
        <NotificationItem
          icon={Bell}
          title="Na plataforma"
          description="Alertas em tempo real no sino da Inexci."
          checked={notifications.pushNotifications}
          onChange={alternar("pushNotifications")}
        />
        <NotificationItem
          icon={MessageCircle}
          title="WhatsApp"
          description="Alertas importantes no seu WhatsApp."
          checked={notifications.whatsappNotifications}
          onChange={alternar("whatsappNotifications")}
        />
      </SettingsGroup>

      <SettingsGroup
        title="O que avisar"
        description="Escolha quais acontecimentos geram aviso."
      >
        <NotificationItem
          icon={FilePlus2}
          title="Novas solicitações"
          description="Quando uma solicitação cirúrgica é criada."
          checked={notifications.newSurgeryRequest}
          onChange={alternar("newSurgeryRequest")}
        />
        <NotificationItem
          icon={RefreshCw}
          title="Mudanças de status"
          description="Quando o status de uma solicitação muda."
          checked={notifications.statusUpdate}
          onChange={alternar("statusUpdate")}
        />
        <NotificationItem
          icon={CircleAlert}
          title="Pendências"
          description="Quando há algo a resolver para a solicitação avançar."
          checked={notifications.pendencies}
          onChange={alternar("pendencies")}
        />
        <NotificationItem
          icon={FileClock}
          title="Documentos vencendo"
          description="Quando um documento está perto do vencimento."
          checked={notifications.expiringDocuments}
          onChange={alternar("expiringDocuments")}
        />
        <NotificationItem
          icon={AtSign}
          title="Menções por e-mail"
          description="E-mail quando alguém menciona você num comentário e a notificação fica 10 minutos sem leitura."
          checked={notifications.mentionEmails}
          onChange={alternar("mentionEmails")}
        />
        <NotificationItem
          icon={CalendarRange}
          title="Resumo semanal por e-mail"
          description="Toda segunda-feira, um resumo das suas solicitações cirúrgicas."
          checked={notifications.weeklyReport}
          onChange={alternar("weeklyReport")}
        />
      </SettingsGroup>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveNotifications}
          isLoading={saving}
          className="min-h-[44px] rounded-xl"
        >
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
