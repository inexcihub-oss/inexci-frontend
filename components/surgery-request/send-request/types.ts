export type SendRequestStep = 1 | 2 | 3 | 4;

export type SendMethod =
  | "email"
  | "email_source"
  | "download"
  | "document"
  | null;

export interface ChecklistItem {
  key: string;
  label: string;
  isComplete: boolean;
  isRequired: boolean;
}

export const SC_CREATION_SOURCE_KEY = "sc_creation_source";

export const SEND_CHECKLIST_KEYS: Record<string, string> = {
  hospital: "Informações Gerais",
  tuss_procedures: "Código TUSS",
  opme_items: "OPME",
  medical_report: "Laudo",
};

export function parseLocalCalendarDate(iso: string): Date | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}
