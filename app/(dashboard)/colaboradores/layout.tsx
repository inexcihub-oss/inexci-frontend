"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Permission, resolveHome } from "@/lib/permissions";

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
 */
export default function ColaboradoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can, permissions, loading } = useAuth();
  const router = useRouter();
  const podeAdministrar = can(Permission.ADMINISTRACAO);

  useEffect(() => {
    if (!loading && !podeAdministrar) {
      router.replace(resolveHome(permissions));
    }
  }, [podeAdministrar, permissions, loading, router]);

  // Enquanto carrega ou sem a permissão, não renderiza conteúdo.
  if (loading || !podeAdministrar) {
    return null;
  }

  return <>{children}</>;
}
