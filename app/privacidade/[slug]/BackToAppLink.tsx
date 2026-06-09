"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * As páginas de `/privacidade` são públicas e ficam fora dos route groups, sem
 * `AuthProvider`. Este link decide o destino com base em indício de sessão local:
 * se houver um usuário salvo no `localStorage`, aponta para a área logada (o guard
 * do dashboard revalida e expulsa se a sessão for inválida); caso contrário, login.
 */
export function BackToAppLink({ className }: { className?: string }) {
  const [href, setHref] = useState("/login");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined" && raw !== "null") {
        const user = JSON.parse(raw);
        if (user?.id) setHref("/dashboard");
      }
    } catch {
      // Mantém o destino padrão (/login) em caso de dado corrompido.
    }
  }, []);

  return (
    <Link href={href} className={className}>
      Voltar para o app
    </Link>
  );
}
