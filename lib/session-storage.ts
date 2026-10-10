export const STORED_USER_KEY = "user";

export type StoredUserResult<T> =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "ok"; user: T };

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function parseStoredUser<
  T extends { id: unknown },
>(): StoredUserResult<T> {
  const raw = storage()?.getItem(STORED_USER_KEY);
  if (!raw || raw === "undefined" || raw === "null") return { kind: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { id?: unknown }).id
    ) {
      return { kind: "ok", user: parsed as T };
    }
  } catch {
  }
  return { kind: "invalid" };
}

export function readStoredUser<T extends { id: unknown }>(): T | null {
  const result = parseStoredUser<T>();
  return result.kind === "ok" ? result.user : null;
}

export function hasStoredSession(): boolean {
  return readStoredUser() !== null;
}

export function writeStoredUser(user: object): void {
  storage()?.setItem(STORED_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  storage()?.removeItem(STORED_USER_KEY);
}
