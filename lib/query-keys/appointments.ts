const ALL = ["appointments"] as const;

export interface AppointmentHubKeyParams {
  from?: string | null;
  to?: string | null;
  status: string[];
  order: string;
  doctorIds: string[];
}

export const appointmentKeys = {
  all: ALL,
  agenda: (from: string, to: string) => [...ALL, "agenda", from, to] as const,
  agendaExport: (from: string, to: string) =>
    [...ALL, "agenda-export", from, to] as const,
  hub: ({ from, to, status, order, doctorIds }: AppointmentHubKeyParams) =>
    [
      ...ALL,
      "hub",
      from ?? null,
      to ?? null,
      status.join(","),
      order,
      doctorIds.join(","),
    ] as const,
  activities: (id: string) => [...ALL, id, "activities"] as const,
};

export const agendaExportKeys = {
  surgeries: (from: string, to: string) =>
    ["surgery-requests", "agenda-export", from, to] as const,
};
