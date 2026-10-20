const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function safeExternalUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  let url: URL;
  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    url = new URL(raw, base);
  } catch {
    return undefined;
  }
  if (url.protocol === "https:") return raw;
  if (url.protocol === "http:") {
    const emProducao = process.env.NODE_ENV === "production";
    if (!emProducao || HOSTS_LOCAIS.has(url.hostname)) return raw;
  }
  return undefined;
}
