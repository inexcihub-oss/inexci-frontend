/**
 * Chaves do TanStack Query compartilhadas entre quem lê e quem invalida.
 *
 * Vivem aqui, e não junto do hook, para que o `AuthContext` possa invalidar a
 * cota sem importar `hooks/useQuota` — que por sua vez importa o `AuthContext`
 * (ciclo).
 */
export const QUOTA_QUERY_KEY = ["billing", "quota"] as const;
