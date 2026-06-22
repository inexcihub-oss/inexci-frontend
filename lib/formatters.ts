/**
 * Formata um CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string | undefined): string {
  if (!cnpj) return "-";
  // Remove tudo que não é número
  const numbers = cnpj.replace(/\D/g, "");
  // Aplica a máscara XX.XXX.XXX/XXXX-XX
  if (numbers.length === 14) {
    return numbers.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return cnpj;
}

/**
 * Formata um CPF no padrão XXX.XXX.XXX-XX
 */
export function formatCPF(cpf: string | undefined): string {
  if (!cpf) return "-";
  // Remove tudo que não é número
  const numbers = cpf.replace(/\D/g, "");
  // Aplica a máscara XXX.XXX.XXX-XX
  if (numbers.length === 11) {
    return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return cpf;
}

/**
 * Formata um telefone no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(phone: string | undefined): string {
  if (!phone) return "-";
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, "");
  // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (numbers.length === 11) {
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (numbers.length === 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

/**
 * Formata uma data ISO ou Date no padrão DD/MM/YYYY.
 * Strings YYYY-MM-DD (ou ISO com essa data) usam a parte calendário diretamente,
 * evitando deslocamento por fuso horário.
 */
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

/**
 * Retorna o timestamp (ms) mais recente entre candidatos ISO ou DD/MM/YYYY.
 */
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

/**
 * Formata uma data como tempo relativo (e.g. "2 dias atrás", "1 mês atrás").
 * Recebe uma string ISO ou Date.
 */
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
