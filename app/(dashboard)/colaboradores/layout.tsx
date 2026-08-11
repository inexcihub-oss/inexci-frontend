"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { permissionForRoute, resolveHome } from "@/lib/permissions";

/**
 * Gate da área de Colaboradores.
 *
 * Filtra por **permissão**, não por `role`. O antigo `isAdmin`
 * (`role === "admin"`) sobrou de antes das áreas existirem e expulsava o admin
 * delegado — que tem `role = "collaborator"` + `Permission.ADMINISTRACAO` —
 * justamente da tela que a permissão dele existe para liberar. Pior: com a
 * casa dele apontando para `/colaboradores`, os dois redirects se encontravam
 * e a aplicação entrava em loop.
 *
 * O destino da recusa sai de `resolveHome`, a mesma função usada pelo
 * `PermissionRouteGuard` e pelo login — mandar para `/dashboard` fixo devolvia
 * o usuário para outra rota que ele também não pode ver.
 *
 * A exigência vem de `permissionForRoute`, não de um `Permission.ADMINISTRACAO`
 * fixo: as telas de hospital, convênio, fornecedor e fabricante moram sob este
 * layout mas são cadastros transversais, abertos a qualquer área. Com a regra
 * escrita aqui também, elas ficavam barradas por este gate mesmo já liberadas
 * no mapa de rotas — dois lugares dizendo coisas diferentes sobre a mesma URL.
 */
export default function ColaboradoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can, permissions, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const exigida = permissionForRoute(pathname);
  const liberado = !exigida || can(exigida);

  useEffect(() => {
    if (!loading && !liberado) {
      router.replace(resolveHome(permissions));
    }
  }, [liberado, permissions, loading, router]);

  // Enquanto carrega ou sem a permissão, não renderiza conteúdo.
  if (loading || !liberado) {
    return null;
  }

  return <>{children}</>;
}
