import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { montarCsp } from "./lib/csp";

// Rotas exclusivas da plataforma (app.inexci.com.br)
const PLATFORM_PREFIXES = [
  "/login",
  "/cadastro",
  "/forgot-password",
  "/confirmar-email",
  "/primeiro-acesso",
  "/dashboard",
  "/solicitacoes-cirurgicas",
  "/solicitacao",
  "/agenda",
  "/atendimento",
  "/pacientes",
  "/hospitais",
  "/convenios",
  "/fornecedores",
  "/fabricantes",
  "/procedimentos",
  "/colaboradores",
  "/notificacoes",
  "/configuracoes",
];

function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const normalizedHost = hostname.split(":")[0].toLowerCase();
  const isProd = process.env.NODE_ENV === "production";

  const isAppDomain =
    normalizedHost.startsWith("app.") ||
    process.env.FORCE_APP_DOMAIN === "true";

  // robots.txt por domínio:
  // - app.inexci.com.br: bloquear crawl completamente
  // - inexci.com.br: permitir indexação e expor sitemap
  if (pathname === "/robots.txt") {
    if (isAppDomain) {
      return new NextResponse("User-agent: *\nDisallow: /\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      });
    }

    return new NextResponse(
      "User-agent: *\nAllow: /\nSitemap: https://inexci.com.br/sitemap.xml\n",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  // Domínio de landing (inexci.com.br) em produção:
  // rotas da plataforma → redireciona para app.inexci.com.br mantendo o path
  if (!isAppDomain && isProd && isPlatformPath(pathname)) {
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appBaseUrl) {
      const appUrl = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        appBaseUrl,
      );
      return NextResponse.redirect(appUrl, { status: 301 });
    }
  }

  // Domínio da plataforma (app.inexci.com.br):
  // raiz → redireciona para login
  if (isAppDomain && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // CSP com nonce por requisição: antes a política estática (next.config.mjs)
  // usava 'unsafe-inline' em script-src, deixando o DOMPurify como única
  // barreira contra XSS. O nonce é gerado aqui (único ponto com acesso à
  // requisição) e propagado tanto para o Next.js (via header da própria
  // requisição, para os scripts que o framework injeta automaticamente)
  // quanto para o navegador (via header da resposta).
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "https://api.inexci.com.br",
  ).origin;
  // Fora do domínio do app e fora das rotas da plataforma (alcançável em dev
  // sem domínio dedicado): é a landing pública, que precisa dos domínios de
  // analytics na CSP. O dashboard nunca recebe essa política mais ampla.
  const isLanding = !isAppDomain && !isPlatformPath(pathname);
  const csp = montarCsp(nonce, apiOrigin, isLanding, !isProd);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // Impede indexação do app por mecanismos de busca.
  if (isAppDomain) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
