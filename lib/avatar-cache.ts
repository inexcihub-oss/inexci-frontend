const CACHE_KEY_PREFIX = "avatar_cache_";
const DEFAULT_TTL_MS = 50 * 60 * 1000;

interface AvatarCacheEntry {
  originalUrl: string;
  resolvedUrl: string;
  expiresAt: number;
}

function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

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
  }
}

export function clearAvatarCache(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch {
  }
}
