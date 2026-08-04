/**
 * Domínios de analytics usados só na landing pública (GTM/GA4 + Meta Pixel).
 * Nunca entram na CSP do dashboard, que lida com dado de paciente.
 */
const LANDING_CONNECT_SRC = [
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://stats.g.doubleclick.net",
];
const LANDING_IMG_SRC = ["https://www.facebook.com"];

/**
 * Monta a CSP com nonce por requisicao. Antes a politica usava
 * 'unsafe-inline' em script-src, o que deixava o DOMPurify como unica
 * barreira, e 'connect-src https:' permitia exfiltrar para qualquer host.
 *
 * `isLanding` amplia connect-src/img-src só o necessário para os beacons de
 * analytics (GTM/GA4, Meta Pixel) da página de marketing pública — o
 * dashboard, que lida com dado de paciente, nunca recebe esses domínios.
 */
export function montarCsp(
  nonce: string,
  apiOrigin: string,
  isLanding = false,
): string {
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  const connectSrc = ["'self'", apiOrigin, wsOrigin];
  const imgSrc = ["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com"];
  if (isLanding) {
    connectSrc.push(...LANDING_CONNECT_SRC);
    imgSrc.push(...LANDING_IMG_SRC);
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}
