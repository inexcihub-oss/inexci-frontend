/**
 * Design System - Inexci Platform
 * Cores e estilos padronizados para toda a plataforma
 */

import { PriorityLevel } from "@/types/surgery-request.types";

/**
 * Cores de prioridade
 * Usadas em badges, botões e indicadores de prioridade
 */
export const priorityColors: Record<
  PriorityLevel,
  { bg: string; text: string; bgClass: string; textClass: string }
> = {
  Baixa: {
    bg: "#D4EFE0",
    text: "#1E6F47",
    bgClass: "bg-[#D4EFE0]",
    textClass: "text-[#1E6F47]",
  },
  Média: {
    bg: "#D8E8F7",
    text: "#1859A3",
    bgClass: "bg-[#D8E8F7]",
    textClass: "text-[#1859A3]",
  },
  Alta: {
    bg: "#FFF3D6",
    text: "#996600",
    bgClass: "bg-[#FFF3D6]",
    textClass: "text-[#996600]",
  },
  Urgente: {
    bg: "#F4E1E3",
    text: "#7A3B3F",
    bgClass: "bg-[#F4E1E3]",
    textClass: "text-[#7A3B3F]",
  },
};

/**
 * Helper function para obter classes de cor por prioridade
 */
export const getPriorityClasses = (priority: PriorityLevel) => {
  return priorityColors[priority];
};

/**
 * Cores de pendências
 */
export const pendencyColors = {
  pending: {
    bg: "#F0E6E4",
    text: "#E34935",
  },
  success: {
    bg: "#E6F4EA",
    text: "#137333",
  },
};

/**
 * Cores de texto padrão
 */
export const textColors = {
  primary: "#000000",
  secondary: "#758195", // rgba(117, 129, 149, 1)
  disabled: "#758195",
};

/**
 * Cores de borda
 */
export const borderColors = {
  default: "#DCDFE3", // rgba(220, 223, 227, 1)
  hover: "#DCDFE3",
};
