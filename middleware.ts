import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  const isAppDomain =
    hostname.startsWith("app.") ||
    // Docker/local dev: allow override via env
    process.env.FORCE_APP_DOMAIN === "true";

  // App domain: redirect root to login
  // The landing page at "/" is the default; platform starts at /login
  if (isAppDomain && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
