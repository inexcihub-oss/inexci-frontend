"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useCallback, useState, useEffect } from "react";
import { useToggle, useClickOutside } from "@/hooks";
import { getInitials, getDisplayName, getAvatarColor } from "@/lib/utils";
import { uploadService } from "@/services/upload.service";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";

interface MenuItem {
  iconSrc: string;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
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
    adminOnly: true,
  },
  {
    iconSrc: "/icons/status-surgeries.svg",
    label: "Procedimentos",
    href: "/procedimentos",
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Resolve signed URL when user.avatar_url changes
  useEffect(() => {
    const raw = user?.avatar_url;
    if (!raw) {
      setAvatarUrl(null);
      return;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      setAvatarUrl(raw);
    } else {
      uploadService
        .getSignedUrl(raw)
        .then(setAvatarUrl)
        .catch(() => setAvatarUrl(null));
    }
  }, [user?.avatar_url]);

  // Filtrar itens do menu com base nas permissões do usuário
  const menuItems = allMenuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  // Carregar estado do localStorage ou usar valor padrão
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  const {
    value: isMenuOpen,
    setFalse: closeMenu,
    toggle: toggleMenu,
  } = useToggle();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, closeMenu, isMenuOpen);

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 lg:relative lg:inset-auto lg:z-auto flex flex-col h-full bg-white px-2 transition-all duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-2.5 py-2 ${
            isCollapsed
              ? "lg:justify-center lg:px-2 justify-between px-4"
              : "justify-between px-4"
          }`}
        >
          <Image
            src="/brand/icon.png"
            alt="Inexci"
            width={32}
            height={32}
            className={`object-contain ${isCollapsed ? "lg:hidden" : ""}`}
          />

          {/* Desktop: Collapse toggle */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex w-11 h-11 items-center justify-center hover:opacity-70 transition-opacity"
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

          {/* Mobile: Close button */}
          <button
            onClick={onMobileClose}
            className="flex lg:hidden w-11 h-11 items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Fechar menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col gap-4 pt-8 px-1">
          {/* Menu Items */}
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[44px] ${
                    isActive
                      ? "bg-neutral-50"
                      : "opacity-70 hover:bg-neutral-50 hover:opacity-100"
                  } ${isCollapsed ? "lg:justify-center" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                  onClick={onMobileClose}
                >
                  <Image
                    src={item.iconSrc}
                    alt={item.label}
                    width={24}
                    height={24}
                    className="text-neutral-900 shrink-0"
                  />
                  <span
                    className={`text-xs md:text-sm font-semibold text-neutral-900 ${
                      isCollapsed ? "lg:hidden" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-1 px-1 pb-1">
          {/* Notifications */}
          <NotificationsDropdown isCollapsed={isCollapsed} />

          {/* Settings */}
          <Link
            href="/configuracoes"
            className={`relative flex items-center gap-2 px-2 py-2 rounded-xl opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-all min-h-[44px] ${isCollapsed ? "lg:justify-center" : ""}`}
            title={isCollapsed ? "Configurações" : undefined}
            onClick={onMobileClose}
          >
            <Image
              src="/icons/settings.svg"
              alt="Configurações"
              width={20}
              height={20}
              className="text-neutral-900 shrink-0"
            />
            {!isCollapsed && (
              <span className="text-xs md:text-sm font-semibold text-neutral-900">
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
            className={`flex items-center gap-1 ${isCollapsed ? "lg:justify-center" : ""}`}
          >
            {/* Avatar or Initials */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-semibold overflow-hidden shrink-0 ${!avatarUrl ? getAvatarColor(user?.name || "User") : ""}`}
              title={isCollapsed ? user?.name || "Usuário" : undefined}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user?.name || "Avatar"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(user?.name || "User")
              )}
            </div>
            <div
              className={`flex-1 flex flex-col min-w-0 ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            >
              <span className="text-xs md:text-sm font-semibold text-neutral-900 truncate">
                {getDisplayName(user?.name || "Usuário")}
              </span>
            </div>
            <button
              onClick={toggleMenu}
              className={`w-6 h-6 hover:opacity-70 transition-opacity flex-shrink-0 ${
                isCollapsed ? "lg:hidden" : ""
              }`}
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
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-neutral-100 rounded-xl shadow-lg overflow-hidden">
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
                <span className="text-xs md:text-sm text-neutral-900">
                  Sair
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
