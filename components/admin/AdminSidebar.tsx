"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useClickOutside, useToggle } from "@/hooks";
import { ADMIN_NAV_SECTIONS, isAdminRouteActive } from "@/lib/admin-nav";
import { cn, getAvatarColor, getDisplayName, getInitials } from "@/lib/utils";

const itemClasses = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm transition-colors duration-200",
    active
      ? "bg-primary-50 font-medium text-primary-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  );

const menuItemClasses =
  "flex w-full min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200";

const COLLAPSED_KEY = "admin-sidebar-collapsed";

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({
  isMobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin: user, logout } = useAdminAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    value: isMenuOpen,
    setFalse: closeMenu,
    toggle: toggleMenu,
  } = useToggle();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(menuRef, closeMenu, isMenuOpen);

  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      menuTriggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen, closeMenu]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {}
  };

  const handleLogout = useCallback(() => {
    closeMenu();
    void logout();
  }, [logout, closeMenu]);

  const displayName = getDisplayName(user?.name || "Administrador");

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 lg:relative lg:inset-auto lg:z-40 flex flex-col h-full bg-white px-2 transition-all duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "lg:w-60",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 py-2 justify-between px-4",
            isCollapsed && "lg:justify-center lg:px-2",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isCollapsed && "lg:hidden",
            )}
          >
            <Image
              src="/brand/icon.png"
              alt="Inexci"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
              Admin
            </span>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex w-11 h-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title={isCollapsed ? "Expandir sidebar" : "Retrair sidebar"}
            aria-label={isCollapsed ? "Expandir" : "Retrair"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onMobileClose}
            className="flex lg:hidden w-11 h-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Menu do painel administrativo"
          className="flex-1 overflow-y-auto pt-4 px-1"
        >
          {ADMIN_NAV_SECTIONS.map((section, index) => (
            <div
              key={section.id}
              role="group"
              aria-label={section.label ?? "Principal"}
              className={cn("flex flex-col gap-0.5", index > 0 && "mt-5")}
            >
              {section.label && (
                <>
                  <p
                    className={cn(
                      "px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400",
                      isCollapsed && "lg:hidden",
                    )}
                  >
                    {section.label}
                  </p>
                  {isCollapsed && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:block mx-3 mb-2 h-px bg-gray-100"
                    />
                  )}
                </>
              )}

              {section.items.map((item) => {
                const active = isAdminRouteActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      itemClasses(active),
                      isCollapsed && "lg:justify-center",
                    )}
                    aria-current={active ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    onClick={onMobileClose}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className={cn(isCollapsed && "lg:hidden")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          className="relative border-t border-gray-100 px-1 py-2"
          ref={menuRef}
        >
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Menu da conta de ${displayName}`}
            title={isCollapsed ? displayName : undefined}
            className={cn(
              "flex w-full min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-gray-50",
              isMenuOpen && "bg-gray-50",
              isCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-gray-700",
                getAvatarColor(user?.name || "User"),
              )}
              aria-hidden="true"
            >
              {getInitials(user?.name || "User")}
            </span>
            <span
              className={cn(
                "flex min-w-0 flex-1 flex-col",
                isCollapsed && "lg:hidden",
              )}
            >
              <span className="truncate text-sm font-medium text-gray-900">
                {displayName}
              </span>
              {user?.email && (
                <span
                  className="truncate text-xs text-gray-500"
                  title={user.email}
                >
                  {user.email}
                </span>
              )}
            </span>
            <ChevronsUpDown
              className={cn(
                "h-4 w-4 shrink-0 text-gray-400",
                isCollapsed && "lg:hidden",
              )}
              aria-hidden="true"
            />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Conta"
              className={cn(
                "absolute bottom-full left-1 right-1 z-50 mb-1 rounded-xl border border-gray-100 bg-white p-1 shadow-lg",
                isCollapsed &&
                  "lg:bottom-2 lg:left-full lg:right-auto lg:mb-0 lg:ml-2 lg:w-56",
              )}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className={cn(
                  menuItemClasses,
                  "text-red-600 hover:bg-red-50 hover:text-red-700",
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
