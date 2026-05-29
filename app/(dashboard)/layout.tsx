import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayoutInner from "./DashboardLayoutInner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
