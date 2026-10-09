import { AppointmentStatus } from "@/services/appointment.service";
import { addDays, startOfDay } from "./calendar";

export type HubTab = "today" | "upcoming" | "done";

export const HUB_PAGE_SIZE = 20;

export const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "upcoming", label: "Próximas" },
  { key: "done", label: "Realizadas" },
];

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
      status: [
        "scheduled",
        "confirmed",
        "waiting",
        "in_progress",
        "completed",
        "no_show",
      ],
      order: "ASC",
    };
  }

  if (tab === "upcoming") {
    return {
      from: today.toISOString(),
      status: ["scheduled", "confirmed"],
      order: "ASC",
    };
  }

  return { status: ["completed"], order: "DESC" };
}

export const HUB_EMPTY_DESCRIPTION: Record<HubTab, string> = {
  today: "Não há consultas para hoje.",
  upcoming: "Não há consultas agendadas a partir de hoje.",
  done: "Nenhuma consulta realizada até agora.",
};
