import type { SurgeryRequestDetail } from "@/services/surgery-request.service";

export interface PatientFormData {
  name: string;
  birthDate: string;
  rg: string;
  cpf: string;
  phone: string;
  address: string;
  zipCode: string;
  healthPlan: string;
}

export const EMPTY_PATIENT_DATA: PatientFormData = {
  name: "",
  birthDate: "",
  rg: "",
  cpf: "",
  phone: "",
  address: "",
  zipCode: "",
  healthPlan: "",
};

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
}

export interface SectionDraft {
  title: string;
  description: string;
}

export const SECTION_TITLE_MAX_LENGTH = 200;

export function formatDateBR(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export function buildPatientData(
  sol: Pick<
    SurgeryRequestDetail,
    "patient" | "healthPlan" | "healthPlanName"
  > | null,
): PatientFormData {
  const p = sol?.patient;
  return {
    name: p?.name ?? "",
    birthDate: formatDateBR(p?.birthDate) ?? "",
    rg: p?.rg ?? "",
    cpf: p?.cpf ?? "",
    phone: p?.phone ?? "",
    address: p?.address ?? "",
    zipCode: p?.zipCode ?? p?.cep ?? "",
    healthPlan: sol?.healthPlan?.name ?? sol?.healthPlanName ?? "",
  };
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
