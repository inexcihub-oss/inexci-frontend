/**
 * Design System - Inexci Platform
 * Cores e estilos padronizados para toda a plataforma
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MOBILE DESIGN SYSTEM — Tokens CSS (definidos em globals.css)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * TIPOGRAFIA:
 *   .ds-page-title    → Título de página (text-base md:text-2xl lg:text-3xl font-semibold)
 *   .ds-modal-title   → Título de modal (text-sm md:text-lg font-semibold)
 *   .ds-section-title → Título de seção (text-sm font-semibold text-gray-900)
 *   .ds-label         → Label de campo (text-xs md:text-sm font-medium text-gray-700)
 *   .ds-body          → Texto de corpo (text-xs md:text-sm text-gray-900)
 *   .ds-caption       → Caption/helper (text-xs text-gray-500)
 *
 * INPUTS:
 *   .ds-input          → Input/Select padrão (h-9 md:h-10, text-base md:text-sm)
 *   .ds-textarea       → Textarea padrão (min-h-[80px] md:min-h-[100px])
 *   .ds-field-readonly → Campo somente leitura
 *
 * BOTÕES:
 *   .ds-btn-primary → Primário (h-11, min-h-[44px], teal-700)
 *   .ds-btn-outline → Outline (h-11, min-h-[44px])
 *   .ds-btn-inline  → Ação inline (h-9, min-h-[36px])
 *   .ds-btn-danger  → Danger (h-11, min-h-[44px], red-500)
 *
 * BADGES:
 *   .ds-badge-sm → Pequeno (px-2 py-0.5 text-xs)
 *   .ds-badge-md → Médio (px-2.5 py-0.5 text-xs)
 *   .ds-badge-lg → Grande (px-3 py-1 text-sm)
 *
 * LAYOUT:
 *   .ds-section-header → Header de seção (px-4 h-11 border-b)
 *   .ds-section-body   → Body de seção (p-4)
 *   .ds-modal-body     → Body de modal (px-5 py-4)
 *   .ds-modal-footer   → Footer de modal (px-5 py-4 border-t)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PriorityLevel, PRIORITY_LABELS } from "@/types/surgery-request.types";

/**
 * Cores de prioridade
 * Usadas em badges, botões e indicadores de prioridade
 * Chaves são números (1=Baixa, 2=Média, 3=Alta, 4=Urgente)
 */
export const priorityColors: Record<
  PriorityLevel,
  { bg: string; text: string; bgClass: string; textClass: string }
> = {
  1: {
    bg: "#D4EFE0",
    text: "#1E6F47",
    bgClass: "bg-[#D4EFE0]",
    textClass: "text-[#1E6F47]",
  },
  2: {
    bg: "#D8E8F7",
    text: "#1859A3",
    bgClass: "bg-[#D8E8F7]",
    textClass: "text-[#1859A3]",
  },
  3: {
    bg: "#FFF3D6",
    text: "#996600",
    bgClass: "bg-[#FFF3D6]",
    textClass: "text-[#996600]",
  },
  4: {
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
 * Helper function para obter label de prioridade
 */
export const getPriorityLabel = (priority: PriorityLevel): string => {
  return PRIORITY_LABELS[priority];
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
