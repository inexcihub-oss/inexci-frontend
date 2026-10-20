export function formatCNPJ(cnpj: string | undefined): string {
  if (!cnpj) return "-";
  const numbers = cnpj.replace(/\D/g, "");
  if (numbers.length === 14) {
    return numbers.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return cnpj;
}

export function formatCPF(cpf: string | undefined): string {
  if (!cpf) return "-";
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length === 11) {
    return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return cpf;
}

export function formatPhone(phone: string | undefined): string {
  if (!phone) return "-";
  const numbers = phone.replace(/\D/g, "");
  if (numbers.length === 11) {
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (numbers.length === 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

export function formatDateBR(dateInput: string | Date): string {
  if (typeof dateInput === "string") {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) return dateInput;
    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "-";
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function getLatestActivityMs(
  ...values: Array<string | null | undefined>
): number {
  let max = 0;

  for (const value of values) {
    if (!value) continue;

    const isoMs = Date.parse(value);
    if (!Number.isNaN(isoMs)) {
      max = Math.max(max, isoMs);
      continue;
    }

    const parts = value.split("/").map(Number);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const brMs = new Date(year, (month || 1) - 1, day || 1).getTime();
      if (!Number.isNaN(brMs)) max = Math.max(max, brMs);
    }
  }

  return max;
}

export function formatTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return "agora";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) return years === 1 ? "1 ano atrás" : `${years} anos atrás`;
  if (months >= 1)
    return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
  if (weeks >= 1)
    return weeks === 1 ? "1 semana atrás" : `${weeks} semanas atrás`;
  if (days >= 1) return days === 1 ? "1 dia atrás" : `${days} dias atrás`;
  if (hours >= 1) return hours === 1 ? "1 hora atrás" : `${hours} horas atrás`;
  if (minutes >= 1)
    return minutes === 1 ? "1 minuto atrás" : `${minutes} minutos atrás`;
  return "agora";
}

export function parseApiDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;

  const value = String(dateInput).trim();
  if (!value) return new Date(NaN);

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (hasTimezone) return new Date(value);

  return new Date(`${value}Z`);
}

export function parseApiDateForRelative(dateInput: string | Date): Date {
  const parsed = parseApiDate(dateInput);
  if (Number.isNaN(parsed.getTime())) return parsed;

  const now = Date.now();
  const diff = parsed.getTime() - now;
  if (diff <= 0) return parsed;

  const offsetMs = new Date().getTimezoneOffset() * 60 * 1000;
  const skewMs = Math.abs(offsetMs);
  const toleranceMs = 30 * 1000;

  if (Math.abs(diff - skewMs) <= toleranceMs) {
    return new Date(parsed.getTime() + offsetMs);
  }

  return parsed;
}

const DOCTOR_TITLE_PREFIX = /^(dr|dra|dr\(a\))\.?\s/i;

export function formatDoctorName(
  name: string | null | undefined,
  isPhysician?: boolean,
): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  if (isPhysician === false) return trimmed;
  return DOCTOR_TITLE_PREFIX.test(trimmed) ? trimmed : `Dr(a). ${trimmed}`;
}

export function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
