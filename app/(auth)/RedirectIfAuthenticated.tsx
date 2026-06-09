"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Rotas de `(auth)` que permanecem acessíveis mesmo com uma sessão ativa. Apenas
 * a confirmação de e-mail: é por token enviado por e-mail e pode ser legitimamente
 * aberta enquanto o usuário está logado. Todas as demais telas de autenticação
 * (login, cadastro, primeiro-acesso, recuperação de senha) só fazem sentido para
 * quem está deslogado — um usuário autenticado é redirecionado para o dashboard.
 */
const ALLOWED_WHILE_AUTHENTICATED = ["/confirmar-email"];

/** Destino quando um usuário já autenticado tenta abrir uma tela de auth. */
const AUTHENTICATED_HOME = "/solicitacoes-cirurgicas";

/**
 * Indício local de sessão (sem request). Usado apenas para decidir se devemos
 * segurar a renderização do formulário enquanto a sessão real é resolvida — assim
 * um usuário logado não vê o form piscar antes do redirect, e um visitante
 * deslogado vê o formulário imediatamente.
 */
function hasLocalSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return false;
    return !!JSON.parse(raw)?.id;
  } catch {
    return false;
  }
}

/**
 * Guard reverso: impede que um usuário já autenticado permaneça em telas públicas
 * de autenticação (login, cadastro, recuperação de senha).
 *
 * Usa navegação dura (`window.location.replace`) em vez de `router.replace`: o
 * redirect cruza do route-group `(auth)` para o `(dashboard)`, e a navegação RSC
 * "soft" do App Router fica dessincronizada nesse cruzamento (a URL muda mas a
 * árvore continua montando a tela de auth). O full reload recarrega a árvore
 * correta do servidor e elimina o desync. Só ocorre para sessão de fato válida
 * (`isAuthenticated` = `/me` ok), então não há risco de loop com o dashboard.
 */
export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  const isExempt = ALLOWED_WHILE_AUTHENTICATED.some((p) =>
    pathname?.startsWith(p),
  );

  useEffect(() => {
    if (loading || isExempt) return;
    if (isAuthenticated && typeof window !== "undefined") {
      window.location.replace(AUTHENTICATED_HOME);
    }
  }, [isAuthenticated, loading, isExempt]);

  // Confirmar-email permanece sempre acessível (confirmação por token).
  if (isExempt) return <>{children}</>;

  // Já autenticado: não renderiza o form enquanto o redirect acontece.
  if (isAuthenticated) return null;

  // Sessão ainda resolvendo E há indício de login: segura o form para evitar o
  // flash antes do redirect. Sem indício, mostra o form imediatamente.
  if (loading && hasLocalSessionHint()) return null;

  return <>{children}</>;
}
