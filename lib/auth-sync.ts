import { SESSION_FLAG_KEY } from "./session-flag";

export const AUTH_EVENT_KEY = "auth_event";

export type AuthSyncEvent = { type: "logout" } | { type: "login"; userId: string };

function randomNonce(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function broadcastAuthEvent(event: AuthSyncEvent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      AUTH_EVENT_KEY,
      JSON.stringify({ ...event, nonce: randomNonce() }),
    );
    window.localStorage.removeItem(AUTH_EVENT_KEY);
  } catch {
  }
}

export function parseAuthSyncEvent(
  event: Pick<StorageEvent, "key" | "newValue" | "oldValue">,
): AuthSyncEvent | null {
  if (event.key === null) return { type: "logout" };
  if (event.key === SESSION_FLAG_KEY) {
    return event.newValue === null && event.oldValue !== null
      ? { type: "logout" }
      : null;
  }
  if (event.key !== AUTH_EVENT_KEY || !event.newValue) return null;
  try {
    const parsed = JSON.parse(event.newValue) as {
      type?: unknown;
      userId?: unknown;
    };
    if (parsed.type === "logout") return { type: "logout" };
    if (parsed.type === "login" && typeof parsed.userId === "string") {
      return { type: "login", userId: parsed.userId };
    }
  } catch {
  }
  return null;
}

export function subscribeAuthEvents(
  handler: (event: AuthSyncEvent) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (storageEvent: StorageEvent) => {
    if (
      storageEvent.storageArea &&
      storageEvent.storageArea !== window.localStorage
    ) {
      return;
    }
    const parsed = parseAuthSyncEvent(storageEvent);
    if (parsed) handler(parsed);
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export function hardNavigate(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}

export function hardReload(): void {
  if (typeof window === "undefined") return;
  window.location.reload();
}
