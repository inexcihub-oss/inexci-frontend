"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import Loading from "@/components/ui/Loading";
import Sidebar from "@/components/Sidebar";
import BottomNavBar from "@/components/BottomNavBar";
import MobileHeaderActions from "@/components/shared/MobileHeaderActions";
import { ConsentGate } from "@/components/privacy/ConsentGate";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import Image from "next/image";

export default function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-white overflow-hidden">
        {/* Sidebar - apenas visível no desktop ou como drawer */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Mobile - Compacto com logo e ações */}
          <header className="flex items-center justify-between px-4 h-14 border-b border-neutral-100 lg:hidden">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/icon.png"
                alt="Inexci"
                width={28}
                height={28}
                className="object-contain"
              />
              <span className="text-sm font-semibold text-neutral-900">
                Inexci
              </span>
            </div>
            <MobileHeaderActions />
          </header>

          <BillingStatusBanner />

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-hidden">
            <ConsentGate>{children}</ConsentGate>
          </main>

          {/* Espaçador reservado para a barra inferior no mobile */}
          <div
            className="lg:hidden flex-shrink-0"
            style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
            aria-hidden
          />
        </div>

        {/* Bottom Navigation - apenas mobile */}
        <BottomNavBar />
      </div>
    </NotificationsProvider>
  );
}
