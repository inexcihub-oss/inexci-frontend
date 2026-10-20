import type { ExtractFromDocumentResponse } from "@/types/surgery-request.types";

export const SC_FROM_DOCUMENT_EXTRACTION_KEY = "sc_from_document_extraction";
export const SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY =
  "sc_from_document_extraction_pending";
export const SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY =
  "sc_from_document_extraction_active";
export const SC_FROM_DOCUMENT_EXTRACTION_PENDING_ERROR_KEY =
  "sc_from_document_extraction_pending_error";
export const SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY =
  "sc_from_document_extraction_foreground";

const STORAGE_ENVELOPE_VERSION = 1;
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

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
  SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY,
] as const;

export interface BackgroundDocumentExtractionActive {
  jobId: string;
  fileName: string;
  startedAt: number;
}

export interface BackgroundDocumentExtractionForeground {
  jobId: string;
}

export interface ScFromDocumentHandoffRecord {
  jobId: string;
  userId: string;
  savedAt: number;
}

export interface ScFromDocumentHandoff {
  result?: ExtractFromDocumentResponse;
  jobId?: string;
}

interface MemoryHandoff {
  userId: string;
  jobId: string | null;
  result: ExtractFromDocumentResponse;
}

let memoryHandoff: MemoryHandoff | null = null;

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

    return parsed as T;
  } catch {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return null;
  }
}

export function removeScFromDocumentStorage(key: string): void {
  if (key === SC_FROM_DOCUMENT_EXTRACTION_KEY) memoryHandoff = null;
  if (!isBrowser()) return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function clearScFromDocumentStorage(): void {
  memoryHandoff = null;
  if (!isBrowser()) return;
  SC_FROM_DOCUMENT_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function isHandoffRecord(value: unknown): value is ScFromDocumentHandoffRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 3 &&
    typeof record.jobId === "string" &&
    record.jobId.length > 0 &&
    typeof record.userId === "string" &&
    record.userId.length > 0 &&
    typeof record.savedAt === "number"
  );
}

export function saveScFromDocumentHandoff({
  result,
  userId,
  jobId,
}: {
  result: ExtractFromDocumentResponse;
  userId: string;
  jobId?: string | null;
}): void {
  memoryHandoff = { userId, jobId: jobId ?? null, result };
  if (!isBrowser()) return;
  sessionStorage.removeItem(SC_FROM_DOCUMENT_EXTRACTION_KEY);
  if (!jobId) {
    localStorage.removeItem(SC_FROM_DOCUMENT_EXTRACTION_KEY);
    return;
  }
  setScFromDocumentStorage<ScFromDocumentHandoffRecord>(
    SC_FROM_DOCUMENT_EXTRACTION_KEY,
    { jobId, userId, savedAt: Date.now() },
  );
}

export function readScFromDocumentHandoff(
  userId: string,
): ScFromDocumentHandoff | null {
  if (isBrowser()) sessionStorage.removeItem(SC_FROM_DOCUMENT_EXTRACTION_KEY);

  if (memoryHandoff && memoryHandoff.userId !== userId) {
    memoryHandoff = null;
  }

  const stored = getScFromDocumentStorage<unknown>(
    SC_FROM_DOCUMENT_EXTRACTION_KEY,
  );
  let storedJobId: string | undefined;
  if (stored !== null) {
    if (isHandoffRecord(stored) && stored.userId === userId) {
      storedJobId = stored.jobId;
    } else if (isBrowser()) {
      localStorage.removeItem(SC_FROM_DOCUMENT_EXTRACTION_KEY);
    }
  }

  if (memoryHandoff) {
    return {
      result: memoryHandoff.result,
      jobId: memoryHandoff.jobId ?? storedJobId,
    };
  }
  return storedJobId ? { jobId: storedJobId } : null;
}
