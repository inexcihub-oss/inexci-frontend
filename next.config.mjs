/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy por ambiente:
 * - dev: permite 'unsafe-eval' (necessário para HMR/hot reload do Next.js) e ws://
 * - prod: remove 'unsafe-eval', mantém apenas o necessário para a aplicação
 *
 * 'unsafe-inline' em script-src é necessário enquanto o Next.js injeta scripts
 * de hidratação via tags <script> inline. Remover requer migração para nonces,
 * que será endereçada quando houver um middleware de CSP por requisição.
 */
const cspDirectives = isProd
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]
  : [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: http://localhost:* ws://localhost:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["localhost", "nuxgxpsofrcaumfvhqbh.supabase.co"],
  },
  // Necessário para builds standalone do Docker
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
          // HSTS: ativado apenas em produção para não interferir no dev local (HTTP)
          // max-age=63072000 = 2 anos; includeSubDomains protege subdomínios
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
