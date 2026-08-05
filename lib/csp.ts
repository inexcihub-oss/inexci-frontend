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
  isDev = false,
): string {
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  // ViaCEP: usado no dashboard (lib/cep.ts) para autocompletar endereço a
  // partir do CEP em formulários de paciente/colaborador/cabeçalho — não é
  // exclusivo da landing, por isso entra sempre, não só sob isLanding.
  const connectSrc = ["'self'", apiOrigin, wsOrigin, "https://viacep.com.br"];
  const imgSrc = ["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com"];
  if (isLanding) {
    connectSrc.push(...LANDING_CONNECT_SRC);
    imgSrc.push(...LANDING_IMG_SRC);
  }
  // O Fast Refresh do Next (yarn dev) usa eval() internamente para aplicar
  // hot updates — sem 'unsafe-eval' o bundle inteiro falha ao avaliar no
  // navegador (EvalError), deixando a página inerte. Só em dev: o build de
  // producao (yarn build && start) não usa esse runtime e não precisa disso.
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
