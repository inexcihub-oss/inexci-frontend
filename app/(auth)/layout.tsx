import { AuthProvider } from "@/contexts/AuthContext";
import { RedirectIfAuthenticated } from "./RedirectIfAuthenticated";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O provider resolve a sessão real (via cookie de refresh) também nas rotas
  // públicas para que o guard reverso saiba quando expulsar um usuário já logado.
  // A contaminação é evitada na própria /confirmar-email (neutra + isenta), não
  // suprimindo a resolução da sessão.
  return (
    <AuthProvider>
      <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
    </AuthProvider>
  );
}
