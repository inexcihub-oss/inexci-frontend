import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para mesclar classes do Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata data no formato brasileiro
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Formata data no formato brasileiro com mês abreviado
 */
export function formatDateWithMonth(dateString: string): string {
  const date = new Date(dateString);
  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
}

/**
 * Formata data e hora no formato brasileiro
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Remove máscara de CPF/CNPJ
 */
export function removeMask(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Gera iniciais a partir de um nome
 */
export function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Remove especialidade médica do nome (tudo após " - ")
 */
export function getDisplayName(name: string): string {
  const nameParts = name.split(" - ");
  return nameParts[0].trim();
}

/**
 * Gera uma cor de fundo baseada no nome (para avatares)
 */
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
    "bg-indigo-200",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

/**
 * Trunca texto com ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Normaliza string para busca (remove acentos, converte para minúsculas)
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se uma string contém outra (case-insensitive, sem acentos)
 */
export function includesIgnoreCase(text: string, search: string): boolean {
  return normalizeForSearch(text).includes(normalizeForSearch(search));
}
