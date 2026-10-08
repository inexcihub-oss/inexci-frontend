/** Hosts da máquina local, onde os arquivos podem ser servidos por http. */
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Devolve a URL de um documento só se ela for segura para virar link ou
 * `window.open`; caso contrário, `undefined`.
 *
 * - `https:` sempre passa.
 * - `http:` passa fora de produção (yarn dev, inclusive acessando pelo IP da
 *   rede) e, em qualquer ambiente, para a própria máquina (build de produção
 *   rodando local) — o arquivo local é servido por http.
 * - Qualquer outro esquema (`javascript:`, `data:`, `vbscript:`...) é recusado.
 *
 * URL relativa é resolvida contra a origem da página (mesma origem = segura).
 */
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
