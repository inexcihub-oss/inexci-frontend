/**
 * Cache de URL do avatar do usuário no localStorage.
 *
 * Quando o avatar_url é um caminho relativo (ex: avatars/uuid.png),
 * é necessário chamar o backend para obter uma signed URL — o que pode
 * ser lento. Este módulo armazena a URL resolvida com um TTL para evitar
 * chamadas desnecessárias ao backend.
 *
 * TTL padrão: 50 minutos (signed URLs geralmente expiram em 1 hora).
 */

const CACHE_KEY_PREFIX = "avatar_cache_";
const DEFAULT_TTL_MS = 50 * 60 * 1000; // 50 minutos

interface AvatarCacheEntry {
  /** Caminho/URL original vindo do backend */
  originalUrl: string;
  /** URL resolvida (signed URL ou URL absoluta) */
  resolvedUrl: string;
  /** Timestamp de expiração em ms (Date.now() + TTL) */
  expiresAt: number;
}

function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

/**
 * Retorna a URL resolvida do avatar se ainda estiver válida no cache.
 * Retorna `null` se não houver cache, se estiver expirado, ou se o
 * originalUrl não corresponder ao valor atual.
 */
export function getAvatarCache(
  userId: string,
  originalUrl: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;

    const entry: AvatarCacheEntry = JSON.parse(raw);

    if (entry.originalUrl !== originalUrl || Date.now() > entry.expiresAt) {
      localStorage.removeItem(getCacheKey(userId));
      return null;
    }

    return entry.resolvedUrl;
  } catch {
    return null;
  }
}

/**
 * Armazena a URL resolvida do avatar no cache.
 */
export function setAvatarCache(
  userId: string,
  originalUrl: string,
  resolvedUrl: string,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: AvatarCacheEntry = {
      originalUrl,
      resolvedUrl,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(getCacheKey(userId), JSON.stringify(entry));
  } catch {
    // Ignora erros de quota ou SSR
  }
}

/**
 * Remove o cache do avatar do usuário.
 * Deve ser chamado ao deletar ou trocar a imagem.
 */
export function clearAvatarCache(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch {
    // Ignora
  }
}
