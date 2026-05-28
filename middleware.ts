import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const normalizedHost = hostname.split(":")[0].toLowerCase();

  const isAppDomain =
    normalizedHost.startsWith("app.") ||
    // Docker/local dev: allow override via env
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

  // App domain: redirect root to login
  // The landing page at "/" is the default; platform starts at /login
  if (isAppDomain && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

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
