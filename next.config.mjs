/** @type {import('next').NextConfig} */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: https://www.google-analytics.com https://analytics.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
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
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "nuxgxpsofrcaumfvhqbh.supabase.co",
      },
    ],
  },
  // Necessário para builds standalone do Docker
  output: "standalone",
  // Evita inferência incorreta do root quando há múltiplos lockfiles no workspace
  outputFileTracingRoot: path.resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/solicitacoes/:id",
        destination: "/solicitacao/:id",
        permanent: true,
      },
    ];
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
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-site",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
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
