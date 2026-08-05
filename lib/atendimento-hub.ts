import { AppointmentStatus } from "@/services/appointment.service";
import { addDays, startOfDay } from "./calendar";

export type HubTab = "today" | "upcoming" | "done";

export const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "upcoming", label: "Próximas" },
  { key: "done", label: "Realizadas" },
];

/**
 * Recorte que cada aba do hub de atendimento pede ao backend. Datas ausentes
 * são intencionais: a janela é aberta daquele lado.
 */
export interface HubTabQuery {
  from?: string;
  to?: string;
  status: AppointmentStatus[];
  order: "ASC" | "DESC";
}

export function hubTabQuery(tab: HubTab, now: Date = new Date()): HubTabQuery {
  const today = startOfDay(now);

  if (tab === "today") {
    return {
      from: today.toISOString(),
      to: addDays(today, 1).toISOString(),
      // Cancelada não aparece na lista do dia.
      status: ["scheduled", "confirmed", "completed", "no_show"],
      order: "ASC",
    };
  }

  if (tab === "upcoming") {
    // "De hoje em diante": inclui o restante de hoje e não tem teto — uma
    // consulta marcada para daqui a três meses precisa aparecer aqui.
    return {
      from: today.toISOString(),
      status: ["scheduled", "confirmed"],
      order: "ASC",
    };
  }

  // Todo o histórico de consultas realizadas, mais recente primeiro: a aba é
  // definida pelo status, não por uma janela de datas.
  return { status: ["completed"], order: "DESC" };
}

export const HUB_EMPTY_DESCRIPTION: Record<HubTab, string> = {
  today: "Não há consultas para hoje.",
  upcoming: "Não há consultas agendadas a partir de hoje.",
  done: "Nenhuma consulta realizada até agora.",
};
