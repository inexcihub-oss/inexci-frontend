const ALL = ["surgery-requests"] as const;
const DETAILS = ["surgery-request"] as const;

export const surgeryRequestKeys = {
  all: ALL,
  kanban: () => [...ALL, "kanban"] as const,
  agenda: () => [...ALL, "agenda"] as const,
  agendaRange: (from: string, to: string) =>
    [...ALL, "agenda", from, to] as const,
  details: () => DETAILS,
  detail: (id: string | number) => [...DETAILS, String(id)] as const,
  pendencies: (id: string | number) =>
    [...DETAILS, String(id), "pendencies"] as const,
  activities: (id: string | number) =>
    [...DETAILS, String(id), "activities"] as const,
};
