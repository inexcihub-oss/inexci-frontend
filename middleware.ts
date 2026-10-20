import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { montarCsp } from "./lib/csp";

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

  if (isAppDomain && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "https://api.inexci.com.br",
  ).origin;
  const isLanding = !isAppDomain && !isPlatformPath(pathname);
  const csp = montarCsp(nonce, apiOrigin, isLanding, !isProd);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

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
