"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { permissionForRoute, resolveHome } from "@/lib/permissions";

/**
 * Esconder o item do menu não basta: link direto, favorito e histórico do
 * navegador levam a rota que o usuário não pode ver. O backend recusa a
 * chamada de qualquer jeito — isto evita a tela de erro, mandando
 * silenciosamente para a primeira rota permitida.
 *
 * `DashboardLayoutInner` só monta este guarda depois que `loading` resolveu
 * e `user` existe — mas ele também checa `loading` por conta própria, para
 * não redirecionar (nem piscar conteúdo) com uma lista de permissões ainda
 * vazia por estar em trânsito, caso venha a ser reutilizado em outro lugar.
 */
export function PermissionRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { permissions, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const exigida = permissionForRoute(pathname);
  const liberado = !exigida || permissions.includes(exigida);

  useEffect(() => {
    if (loading) return;
    if (!liberado) router.replace(resolveHome(permissions));
  }, [loading, liberado, permissions, router]);

  if (loading || !liberado) return null;

  return <>{children}</>;
}
