/**
 * Pista de "já houve sessão" para evitar refresh proativo em visitante anônimo.
 *
 * O access token vive só em memória, então após um reload não sabemos se existe
 * um cookie de refresh válido sem chamar `/auth/refresh`. Para não disparar esse
 * POST (e gerar ruído `Refresh token ausente` nos logs) para quem nunca logou,
 * gravamos uma flag leve no `localStorage` no login e a limpamos no logout.
 *
 * É apenas uma heurística de UX/observabilidade — não é credencial e não
 * concede acesso a nada (o backend continua sendo a fonte de verdade).
 */
const SESSION_FLAG_KEY = "had_session";

export function markSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_FLAG_KEY, "1");
}

export function clearSessionFlag(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_FLAG_KEY);
}

export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_FLAG_KEY) === "1";
}
