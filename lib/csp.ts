const LANDING_CONNECT_SRC = [
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://stats.g.doubleclick.net",
];
const LANDING_IMG_SRC = ["https://www.facebook.com"];

export function montarCsp(
  nonce: string,
  apiOrigin: string,
  isLanding = false,
  isDev = false,
): string {
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  const connectSrc = ["'self'", apiOrigin, wsOrigin, "https://viacep.com.br"];
  const imgSrc = ["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com"];
  if (isLanding) {
    connectSrc.push(...LANDING_CONNECT_SRC);
    imgSrc.push(...LANDING_IMG_SRC);
  }
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
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
