import { AuthProvider } from "@/contexts/AuthContext";
import { RedirectIfAuthenticated } from "./RedirectIfAuthenticated";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
    </AuthProvider>
  );
}
