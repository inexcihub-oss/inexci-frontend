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
