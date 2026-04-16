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
