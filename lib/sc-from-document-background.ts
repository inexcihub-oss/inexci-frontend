export const SC_FROM_DOCUMENT_EXTRACTION_KEY = "sc_from_document_extraction";
export const SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY =
  "sc_from_document_extraction_pending";
export const SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY =
  "sc_from_document_extraction_active";
export const SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY =
  "sc_from_document_extraction_pending_error";

const STORAGE_ENVELOPE_VERSION = 1;
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2h

interface StorageEnvelope<T> {
  v: number;
  expiresAt: number;
  value: T;
}

const SC_FROM_DOCUMENT_KEYS = [
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY,
] as const;

export interface BackgroundDocumentExtractionActive {
  jobId: string;
  fileName: string;
  startedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function setScFromDocumentStorage<T>(
  key: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  if (!isBrowser()) return;

  const payload: StorageEnvelope<T> = {
    v: STORAGE_ENVELOPE_VERSION,
    expiresAt: Date.now() + Math.max(ttlMs, 5 * 60 * 1000),
    value,
  };

  localStorage.setItem(key, JSON.stringify(payload));
}

export function getScFromDocumentStorage<T>(key: string): T | null {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StorageEnvelope<T> | T | null | undefined;

    if (
      parsed &&
      typeof parsed === "object" &&
      "expiresAt" in parsed &&
      "value" in parsed
    ) {
      const envelope = parsed as StorageEnvelope<T>;
      if (Date.now() > envelope.expiresAt) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        return null;
      }
      return envelope.value;
    }

    // Fallback para formato legado sem envelope/TTL
    return parsed as T;
  } catch {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return null;
  }
}

export function removeScFromDocumentStorage(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function clearScFromDocumentStorage(): void {
  if (!isBrowser()) return;
  SC_FROM_DOCUMENT_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
