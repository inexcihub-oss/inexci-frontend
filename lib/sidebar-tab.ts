export type SidebarTab = "pendencias" | "atividades" | "timeline";

const ABAS: SidebarTab[] = ["pendencias", "atividades", "timeline"];

export function resolveSidebarTabFromQuery(
  value: string | null,
): SidebarTab | null {
  if (!value) return null;
  return ABAS.includes(value as SidebarTab) ? (value as SidebarTab) : null;
}
