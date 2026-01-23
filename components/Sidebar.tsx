"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useCallback, useState } from "react";
import { useToggle, useClickOutside } from "@/hooks";
import { getInitials, getDisplayName, getAvatarColor } from "@/lib/utils";

interface MenuItem {
  iconSrc: string;
  label: string;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    iconSrc: "/icons/dashboard.svg",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    iconSrc: "/icons/grid-layout.svg",
    label: "Solicitações Cirúrgicas",
    href: "/solicitacoes-cirurgicas",
  },
  {
    iconSrc: "/icons/user-add.svg",
    label: "Pacientes",
    href: "/pacientes",
  },
  {
    iconSrc: "/icons/user-profile.svg",
    label: "Colaboradores",
    href: "/colaboradores",
  },
  {
    iconSrc: "/icons/status-surgeries.svg",
    label: "Procedimentos",
    href: "/procedimentos",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    value: isMenuOpen,
    setFalse: closeMenu,
    toggle: toggleMenu,
  } = useToggle();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, closeMenu, isMenuOpen);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`flex flex-col h-full bg-white px-2 transition-all duration-300 ${isCollapsed ? "w-16" : "w-60"}`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 py-2 ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}
      >
        {!isCollapsed && (
          <Image
            src="/brand/icon.png"
            alt="Inexci"
            width={32}
            height={32}
            className="object-contain"
          />
        )}
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity"
          title={isCollapsed ? "Expandir sidebar" : "Retrair sidebar"}
        >
          <Image
            src={
              isCollapsed
                ? "/icons/sidebar-toggle-expand.svg"
                : "/icons/sidebar-toggle.svg"
            }
            alt={isCollapsed ? "Expandir" : "Retrair"}
            width={24}
            height={24}
          />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col gap-4 pt-8 px-1">
        {/* Inexci IA */}
        <div className="flex flex-col gap-1 opacity-70">
          <div
            className={`flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-50 transition-colors ${isCollapsed ? "justify-center" : ""}`}
          >
            <Image
              src="/icons/smart-toy.svg"
              alt="Inexci IA"
              width={24}
              height={24}
              className="text-neutral-900"
            />
            {!isCollapsed && (
              <span className="text-sm font-semibold text-neutral-900">
                Inexci IA
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-100" />

        {/* Menu Items */}
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-neutral-50"
                    : "opacity-70 hover:bg-neutral-50 hover:opacity-100"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Image
                  src={item.iconSrc}
                  alt={item.label}
                  width={24}
                  height={24}
                  className="text-neutral-900"
                />
                {!isCollapsed && (
                  <span className="text-sm font-semibold text-neutral-900">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 px-1 pb-1">
        {/* Settings */}
        <Link
          href="/configuracoes"
          className={`flex items-center gap-2 px-2 py-2 rounded-lg opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-colors ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "Configurações" : undefined}
        >
          <Image
            src="/icons/settings.svg"
            alt="Configurações"
            width={24}
            height={24}
            className="text-neutral-900"
          />
          {!isCollapsed && (
            <span className="text-sm font-semibold text-neutral-900">
              Configurações
            </span>
          )}
        </Link>
      </div>

      {/* User Profile */}
      <div
        className={`relative py-6 border-t border-neutral-100 ${isCollapsed ? "px-1" : "px-2"}`}
        ref={menuRef}
      >
        <div
          className={`flex items-center gap-1 ${isCollapsed ? "justify-center" : ""}`}
        >
          {/* Avatar or Initials */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold overflow-hidden ${getAvatarColor(
              user?.name || "User",
            )}`}
            title={isCollapsed ? user?.name || "Usuário" : undefined}
          >
            {getInitials(user?.name || "User")}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-sm font-semibold text-neutral-900 truncate">
                  {getDisplayName(user?.name || "Usuário")}
                </span>
              </div>
              <button
                onClick={toggleMenu}
                className="w-6 h-6 hover:opacity-70 transition-opacity flex-shrink-0"
                title="Menu"
              >
                <Image
                  src="/icons/dots-menu.svg"
                  alt="Menu"
                  width={24}
                  height={24}
                  className="text-gray-600"
                />
              </button>
            </>
          )}
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && !isCollapsed && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-neutral-100 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => {
                handleLogout();
                closeMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
                  stroke="#111111"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm text-neutral-900">Sair</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
