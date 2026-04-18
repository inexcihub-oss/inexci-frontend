"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

interface NavItem {
  iconSrc: string;
  label: string;
  href: string;
}

// Itens sempre visíveis na barra inferior
const PRIMARY_ITEMS: NavItem[] = [
  { iconSrc: "/icons/dashboard.svg", label: "Dashboard", href: "/dashboard" },
  {
    iconSrc: "/icons/grid-layout.svg",
    label: "Solicitações",
    href: "/solicitacoes-cirurgicas",
  },
  { iconSrc: "/icons/user-add.svg", label: "Pacientes", href: "/pacientes" },
  {
    iconSrc: "/icons/status-surgeries.svg",
    label: "Procedimentos",
    href: "/procedimentos",
  },
];

// Itens exclusivos de admin — aparecem no overflow sheet
const ADMIN_OVERFLOW_ITEMS: NavItem[] = [
  {
    iconSrc: "/icons/user-profile.svg",
    label: "Colaboradores",
    href: "/colaboradores",
  },
  { iconSrc: "/icons/users.svg", label: "Hospitais", href: "/hospitais" },
  {
    iconSrc: "/icons/document.svg",
    label: "Convênios",
    href: "/convenios",
  },
  {
    iconSrc: "/icons/dollar-cash-circle.svg",
    label: "Fornecedores",
    href: "/fornecedores",
  },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [overflowOpen, setOverflowOpen] = useState(false);

  const closeOverflow = () => setOverflowOpen(false);
  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(closeOverflow);

  // Fecha o overflow ao navegar
  useEffect(() => {
    setOverflowOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  // Verifica se a página atual está em um dos itens de overflow
  const overflowActive = useMemo(
    () => isAdmin && ADMIN_OVERFLOW_ITEMS.some((item) => isActive(item.href)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, isAdmin],
  );

  const isDragging = dragY > 0;

  return (
    <>
      {/* Barra principal */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white/95 backdrop-blur-lg border-t border-neutral-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around px-1 h-16">
          {PRIMARY_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 flex-1
                  py-1.5 rounded-2xl transition-all duration-200
                  min-h-[44px] min-w-[44px]
                  ${active ? "text-primary-600" : "text-neutral-200 hover:text-neutral-900"}
                `}
              >
                {active && (
                  <div className="absolute -top-0.5 w-5 h-0.5 bg-primary-600 rounded-full" />
                )}
                <div
                  className={`w-6 h-6 relative transition-transform duration-200 ${active ? "scale-110" : ""}`}
                >
                  <Image
                    src={item.iconSrc}
                    alt={item.label}
                    width={24}
                    height={24}
                    className={`transition-all duration-200 ${
                      active
                        ? "brightness-0 saturate-100 [filter:invert(55%)_sepia(65%)_saturate(480%)_hue-rotate(130deg)_brightness(92%)_contrast(92%)]"
                        : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium leading-tight transition-colors duration-200 ${
                    active
                      ? "text-primary-600 font-semibold"
                      : "text-neutral-200"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botão "Mais" — apenas para admin */}
          {isAdmin && (
            <button
              onClick={() => setOverflowOpen((v) => !v)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 flex-1
                py-1.5 rounded-2xl transition-all duration-200
                min-h-[44px] min-w-[44px]
                ${overflowActive || overflowOpen ? "text-primary-600" : "text-neutral-200 hover:text-neutral-900"}
              `}
            >
              {(overflowActive || overflowOpen) && (
                <div className="absolute -top-0.5 w-5 h-0.5 bg-primary-600 rounded-full" />
              )}
              {/* Ícone de três pontos */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  overflowActive || overflowOpen
                    ? "text-primary-600 font-semibold"
                    : "text-neutral-200"
                }`}
              >
                Mais
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Overflow sheet — itens de admin */}
      {isAdmin && overflowOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 lg:hidden bg-black/30 animate-fade-in"
            style={{ opacity: isDragging ? Math.max(0.2, 1 - dragY / 200) : 1 }}
            onClick={closeOverflow}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-60 lg:hidden bg-white rounded-t-3xl shadow-xl animate-slide-up"
            style={
              isDragging
                ? { transform: `translateY(${dragY}px)`, transition: "none" }
                : undefined
            }
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            {/* Itens */}
            <div
              className="grid grid-cols-4 gap-1 px-4"
              style={{
                paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {ADMIN_OVERFLOW_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors ${
                      active
                        ? "bg-primary-50 text-primary-600"
                        : "hover:bg-neutral-50 text-neutral-200 hover:text-neutral-900"
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Image
                        src={item.iconSrc}
                        alt={item.label}
                        width={28}
                        height={28}
                        className={`transition-all duration-200 ${
                          active
                            ? "brightness-0 saturate-100 [filter:invert(55%)_sepia(65%)_saturate(480%)_hue-rotate(130deg)_brightness(92%)_contrast(92%)]"
                            : ""
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium text-center leading-tight ${
                        active
                          ? "text-primary-600 font-semibold"
                          : "text-neutral-900"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
