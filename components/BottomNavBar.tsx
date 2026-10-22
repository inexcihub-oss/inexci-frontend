"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import {
  mobileNavItems,
  NAV_GROUP_META,
  NAV_SECTION_LABELS,
  navItemPermission,
  NavItem,
  Permission,
} from "@/lib/permissions";
import { useOnboardingAction } from "@/components/onboarding/useOnboardingAction";
import { ACAO_CADASTROS_ABRIR_MENU_MOBILE } from "@/lib/onboarding/tour-registry";

interface BottomNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  permission: Permission | null;
  sheetGroup: string;
}

const toBottomItem = (item: NavItem): BottomNavItem => ({
  icon: item.icon,
  label: item.shortLabel ?? item.label,
  href: item.href,
  permission: navItemPermission(item),
  sheetGroup: item.group
    ? NAV_GROUP_META[item.group].label
    : (NAV_SECTION_LABELS[item.section] ?? "Menu"),
});

const PRIMARY_ITEMS = mobileNavItems("primary").map(toBottomItem);
const OVERFLOW_ITEMS = mobileNavItems("overflow").map(toBottomItem);

export default function BottomNavBar() {
  const pathname = usePathname();
  const { can } = useAuth();
  const [overflowOpen, setOverflowOpen] = useState(false);

  useOnboardingAction(ACAO_CADASTROS_ABRIR_MENU_MOBILE, () =>
    setOverflowOpen(true),
  );

  const closeOverflow = () => setOverflowOpen(false);
  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(closeOverflow);

  const primaryItems = useMemo(
    () =>
      PRIMARY_ITEMS.filter((item) => !item.permission || can(item.permission)),
    [can],
  );

  const overflowItems = useMemo(
    () =>
      OVERFLOW_ITEMS.filter((item) => !item.permission || can(item.permission)),
    [can],
  );

  const overflowGroups = useMemo(() => {
    const grupos = new Map<string, BottomNavItem[]>();
    for (const item of overflowItems) {
      grupos.set(item.sheetGroup, [
        ...(grupos.get(item.sheetGroup) ?? []),
        item,
      ]);
    }
    return Array.from(grupos.entries());
  }, [overflowItems]);

  const totalSlots = primaryItems.length + (overflowItems.length > 0 ? 1 : 0);
  const isSparse = totalSlots > 0 && totalSlots <= 3;

  useEffect(() => {
    setOverflowOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  const overflowActive = overflowItems.some((item) => isActive(item.href));

  const isDragging = dragY > 0;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white/95 backdrop-blur-lg border-t border-neutral-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className={`flex items-center px-1 h-16 ${isSparse ? "justify-center" : "justify-around"}`}
        >
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 flex-1
                  ${isSparse ? "max-w-[130px]" : ""}
                  py-1.5 rounded-2xl transition-all duration-200
                  min-h-[44px] min-w-[44px]
                  ${active ? "text-primary-600" : "text-neutral-200 hover:text-neutral-900"}
                `}
              >
                {active && (
                  <div className="absolute -top-0.5 w-5 h-0.5 bg-primary-600 rounded-full" />
                )}
                <item.icon
                  className={`h-6 w-6 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                  aria-hidden="true"
                />
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

          {overflowItems.length > 0 && (
            <button
              onClick={() => setOverflowOpen((v) => !v)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 flex-1
                ${isSparse ? "max-w-[130px]" : ""}
                py-1.5 rounded-2xl transition-all duration-200
                min-h-[44px] min-w-[44px]
                ${overflowActive || overflowOpen ? "text-primary-600" : "text-neutral-200 hover:text-neutral-900"}
              `}
            >
              {(overflowActive || overflowOpen) && (
                <div className="absolute -top-0.5 w-5 h-0.5 bg-primary-600 rounded-full" />
              )}
              <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
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

      {overflowOpen && (
        <>
          <div
            className="fixed inset-0 z-50 lg:hidden bg-black/30 animate-fade-in"
            style={{ opacity: isDragging ? Math.max(0.2, 1 - dragY / 200) : 1 }}
            onClick={closeOverflow}
          />

          <div
            data-tour="cadastros-menu-mobile"
            className="fixed inset-x-0 bottom-0 z-[60] lg:hidden bg-white rounded-t-3xl shadow-xl animate-slide-up"
            style={
              isDragging
                ? { transform: `translateY(${dragY}px)`, transition: "none" }
                : undefined
            }
          >
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div
              className="space-y-4 px-4"
              style={{
                paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {overflowGroups.map(([grupo, itens]) => (
                <section key={grupo} aria-label={grupo}>
                  <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {grupo}
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {itens.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors ${
                            active
                              ? "bg-primary-50 text-primary-600"
                              : "hover:bg-neutral-50 text-gray-600 hover:text-neutral-900"
                          }`}
                        >
                          <item.icon className="h-6 w-6" aria-hidden="true" />
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
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
