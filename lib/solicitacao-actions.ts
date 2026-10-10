export const SOLICITACAO_ACTIONS = [
  "send",
  "start-analysis",
  "update-authorizations",
  "confirm-date",
  "surgery-status",
  "invoice",
  "confirm-receipt",
  "close",
] as const;

export type SolicitacaoAction = (typeof SOLICITACAO_ACTIONS)[number];

export type CardMenuAction = SolicitacaoAction | "view" | "edit";

export function parseSolicitacaoAction(
  value: string | null | undefined,
): SolicitacaoAction | null {
  if (!value) return null;
  return (SOLICITACAO_ACTIONS as readonly string[]).includes(value)
    ? (value as SolicitacaoAction)
    : null;
}

export function buildSolicitacaoActionHref(
  id: string,
  action: CardMenuAction,
): string {
  if (action === "view" || action === "edit") return `/solicitacao/${id}`;
  return `/solicitacao/${id}?action=${action}`;
}
