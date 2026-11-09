"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { buildAdminLoginUrl, isAdminPublicPath } from "@/lib/admin-nav";
import Loading from "@/components/ui/Loading";
import AdminSidebar from "@/components/admin/AdminSidebar";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isPublic = isAdminPublicPath(pathname);

  useEffect(() => {
    if (isPublic || loading || admin) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(buildAdminLoginUrl(`${pathname}${search}`));
  }, [isPublic, loading, admin, pathname, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isPublic) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="relative flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-white">
      <AdminSidebar
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
            <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-50"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto overscroll-y-contain lg:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
