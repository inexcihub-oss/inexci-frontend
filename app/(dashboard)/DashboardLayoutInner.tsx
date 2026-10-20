"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import Loading from "@/components/ui/Loading";
import Sidebar from "@/components/Sidebar";
import BottomNavBar from "@/components/BottomNavBar";
import MobileHeaderActions from "@/components/shared/MobileHeaderActions";
import { ConsentGate } from "@/components/privacy/ConsentGate";
import { PermissionRouteGuard } from "@/components/PermissionRouteGuard";
import { GlobalBanners } from "@/components/billing/GlobalBanners";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import Image from "next/image";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAccountOwner, subscription } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const subscriptionStatus = subscription?.subscription.status;
  const isPlanPage = pathname.startsWith("/configuracoes");
  const shouldBlockDashboard =
    isAccountOwner &&
    !isPlanPage &&
    (subscriptionStatus === "canceled" || subscriptionStatus === "suspended");

  const lockTitle =
    subscriptionStatus === "canceled"
      ? "Assinatura cancelada"
      : "Assinatura suspensa";
  const lockDescription =
    subscriptionStatus === "canceled"
      ? "Sua conta está com acesso bloqueado. Para continuar usando a plataforma, escolha um novo plano."
      : "Sua conta está com acesso bloqueado por pendência de pagamento. Regularize para liberar o uso novamente.";
  const lockAction =
    subscriptionStatus === "canceled"
      ? "Escolher plano"
      : "Regularizar assinatura";

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
      <div className="relative flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-white">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
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

          <main className="flex flex-1 flex-col overflow-y-auto overscroll-y-contain lg:overflow-hidden">
            <PermissionRouteGuard>
              <ConsentGate>
                <OnboardingProvider>
                  <div className="flex-none">
                    <GlobalBanners />
                  </div>
                  <OnboardingGate>{children}</OnboardingGate>
                  <BottomNavBar />
                </OnboardingProvider>
              </ConsentGate>
            </PermissionRouteGuard>
          </main>

          <div
            className="lg:hidden flex-shrink-0"
            style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
            aria-hidden
          />
        </div>

        {shouldBlockDashboard && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[2px] sm:p-6">
            <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl ring-1 ring-black/5 sm:p-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <LockKeyhole className="h-7 w-7" />
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
                  {lockTitle}
                </h2>
                <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
                  {lockDescription}
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/configuracoes?tab=plan"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  {lockAction}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </NotificationsProvider>
  );
}
