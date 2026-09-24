export type SidebarTab = "pendencias" | "atividades" | "timeline";

const ABAS: SidebarTab[] = ["pendencias", "atividades", "timeline"];

/**
 * Traduz `?sidebar=` no painel lateral da solicitação.
 *
 * É o que faz o link da notificação de menção
 * (`/solicitacao/:id?sidebar=atividades`) cair na aba certa — inclusive no
 * mobile, onde o painel é um bottom-sheet que começa fechado. Valor
 * desconhecido vira `null` para não sobrescrever a aba padrão da tela.
 */
export function resolveSidebarTabFromQuery(
  value: string | null,
): SidebarTab | null {
  if (!value) return null;
  return ABAS.includes(value as SidebarTab) ? (value as SidebarTab) : null;
}
