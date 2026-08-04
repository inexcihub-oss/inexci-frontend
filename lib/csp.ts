/**
 * Monta a CSP com nonce por requisicao. Antes a politica usava
 * 'unsafe-inline' em script-src, o que deixava o DOMPurify como unica
 * barreira, e 'connect-src https:' permitia exfiltrar para qualquer host.
 */
export function montarCsp(nonce: string, apiOrigin: string): string {
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ${wsOrigin}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}
