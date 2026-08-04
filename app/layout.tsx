import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Inexci - Sistema de Gestão Cirúrgica",
  description: "Sistema de gestão de solicitações cirúrgicas",
  icons: {
    icon: "/brand/icon.png",
    shortcut: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A leitura do header abaixo não é usada diretamente no JSX, mas força a
  // renderização dinâmica por requisição — necessária para o Next.js aplicar
  // automaticamente o nonce da CSP (emitido pelo middleware) aos scripts que
  // o próprio framework injeta (bundle da aplicação, hidratação etc.). Ver
  // `lib/csp.ts` e `middleware.ts`.
  const _nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
