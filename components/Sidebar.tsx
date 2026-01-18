"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useCallback, ReactNode } from "react";
import { useToggle, useClickOutside } from "@/hooks";
import { getInitials, getDisplayName, getAvatarColor } from "@/lib/utils";
import {
  DotsMenuIcon,
  DashboardIcon,
  GridIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  SmartToyIcon,
  SettingsIcon,
} from "@/components/ui";

interface MenuItem {
  icon: ReactNode;
  label: string;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    icon: <DashboardIcon size={24} className="text-neutral-900" />,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: <GridIcon size={24} className="text-neutral-900" />,
    label: "Procedimentos Cirúrgicos",
    href: "/procedimentos-cirurgicos",
  },
  {
    icon: <UserIcon size={24} className="text-neutral-900" />,
    label: "Pacientes",
    href: "/pacientes",
  },
  {
    icon: <UsersIcon size={24} className="text-neutral-900" />,
    label: "Colaboradores",
    href: "/colaboradores",
  },
  {
    icon: <ClockIcon size={24} className="text-neutral-900" />,
    label: "Histórico",
    href: "/historico",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
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

  return (
    <div className="flex flex-col h-full w-60 bg-white px-2">
      {/* Logo */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-2">
        <Image
          src="/brand/icon.png"
          alt="Inexci"
          width={32}
          height={32}
          className="object-contain"
        />
        <button className="w-8 h-8 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="#111111"
              strokeWidth="1.5"
            />
            <line
              x1="8.5"
              y1="3"
              x2="8.5"
              y2="21"
              stroke="#111111"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col gap-4 pt-8 px-1">
        {/* Inexci IA */}
        <div className="flex flex-col gap-1 opacity-70">
          <div className="flex items-center gap-2 px-2 py-2 bg-neutral-50 rounded-lg">
            <SmartToyIcon size={24} className="text-neutral-900" />
            <span className="text-sm font-semibold text-neutral-900">
              Inexci IA
            </span>
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
                }`}
              >
                {item.icon}
                <span className="text-sm font-semibold text-neutral-900">
                  {item.label}
                </span>
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
          className="flex items-center gap-2 px-2 py-2 rounded-lg opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-colors"
        >
          <SettingsIcon size={24} className="text-neutral-900" />
          <span className="text-sm font-semibold text-neutral-900">
            Configurações
          </span>
        </Link>
      </div>

      {/* User Profile */}
      <div
        className="relative px-2 py-6 border-t border-neutral-100"
        ref={menuRef}
      >
        <div className="flex items-center gap-1">
          {/* Avatar or Initials */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold overflow-hidden ${getAvatarColor(
              user?.name || "User",
            )}`}
          >
            {getInitials(user?.name || "User")}
          </div>
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
            <DotsMenuIcon size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
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
