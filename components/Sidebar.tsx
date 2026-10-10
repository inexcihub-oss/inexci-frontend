"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useCallback, useState, useEffect } from "react";
import { useToggle, useClickOutside } from "@/hooks";
import { getInitials, getDisplayName, getAvatarColor } from "@/lib/utils";
import { useUserAvatarUrl } from "@/hooks/useUserAvatarUrl";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import {
  CADASTROS_HREFS,
  NAV_ITEMS,
  navItemPermission,
  Permission,
} from "@/lib/permissions";

interface MenuItem {
  type: "item";
  iconSrc: string;
  label: string;
  href: string;
  permission?: Permission;
}

interface MenuGroup {
  type: "group";
  iconSrc: string;
  label: string;
  children: MenuItem[];
  permission?: Permission;
}

type NavigationEntry = MenuItem | MenuGroup;

export function filterMenuItems(
  items: NavigationEntry[],
  can: (permission: Permission) => boolean,
): NavigationEntry[] {
  return items.reduce<NavigationEntry[]>((visible, entry) => {
    if (entry.permission && !can(entry.permission)) return visible;

    if (entry.type === "item") {
      visible.push(entry);
      return visible;
    }

    const children = entry.children.filter(
      (child) => !child.permission || can(child.permission),
    );
    if (children.length === 0) return visible;

    visible.push({ ...entry, children });
    return visible;
  }, []);
}

function buildMenuEntries(): NavigationEntry[] {
  const entries: NavigationEntry[] = [];
  let cadastros: MenuGroup | null = null;
  for (const item of NAV_ITEMS) {
    const entry: MenuItem = {
      type: "item",
      iconSrc: item.iconSrc,
      label: item.label,
      href: item.href,
      permission: navItemPermission(item) ?? undefined,
    };
    if (item.group !== "cadastros") {
      entries.push(entry);
      continue;
    }
    if (!cadastros) {
      cadastros = {
        type: "group",
        iconSrc: "/icons/list.svg",
        label: "Cadastros",
        children: [],
      };
      entries.push(cadastros);
    }
    cadastros.children.push(entry);
  }
  return entries;
}

const allMenuItems = buildMenuEntries();

const isCadastrosPath = (pathname: string) =>
  CADASTROS_HREFS.some(
    (basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`),
  );

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
  const { user, logout, can } = useAuth();
  const avatarUrl = useUserAvatarUrl();
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(() =>
    isCadastrosPath(pathname),
  );

  const menuItems = filterMenuItems(allMenuItems, can);

  useEffect(() => {
    if (isCadastrosPath(pathname)) {
      setIsCadastrosOpen(true);
    }
  }, [pathname]);

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

  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 lg:relative lg:inset-auto lg:z-40 flex flex-col h-full bg-white px-2 transition-all duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      >
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

        <div className="flex-1 flex flex-col gap-4 pt-8 px-1">
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              if (item.type === "group") {
                const isGroupActive = item.children.some((child) =>
                  isRouteActive(child.href),
                );

                return (
                  <div key={item.label} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setIsCadastrosOpen(true);
                          return;
                        }
                        setIsCadastrosOpen((prev) => !prev);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[44px] ${
                        isGroupActive
                          ? "bg-neutral-50"
                          : "opacity-70 hover:bg-neutral-50 hover:opacity-100"
                      } ${isCollapsed ? "lg:justify-center" : ""}`}
                      title={isCollapsed ? item.label : undefined}
                      data-tour="cadastros-menu"
                    >
                      <Image
                        src={item.iconSrc}
                        alt={item.label}
                        width={24}
                        height={24}
                        className="text-neutral-900 shrink-0"
                      />
                      <span
                        className={`text-xs md:text-sm font-semibold text-neutral-900 flex-1 text-left ${
                          isCollapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-500 transition-transform ${
                          isCadastrosOpen ? "rotate-180" : ""
                        } ${isCollapsed ? "lg:hidden" : ""}`}
                        strokeWidth={2}
                      />
                    </button>

                    {isCadastrosOpen && !isCollapsed && (
                      <div className="flex flex-col gap-1 pl-3 lg:pl-4">
                        {item.children.map((child) => {
                          const isChildActive = isRouteActive(child.href);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 min-h-[40px] ${
                                isChildActive
                                  ? "bg-neutral-50"
                                  : "opacity-70 hover:bg-neutral-50 hover:opacity-100"
                              }`}
                              onClick={onMobileClose}
                            >
                              <Image
                                src={child.iconSrc}
                                alt={child.label}
                                width={20}
                                height={20}
                                className="text-neutral-900 shrink-0"
                              />
                              <span className="text-xs md:text-sm font-semibold text-neutral-900">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isRouteActive(item.href);

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

        <div className="flex flex-col gap-1 px-1 pb-1">
          <NotificationsDropdown isCollapsed={isCollapsed} />

          <Link
            href="/configuracoes"
            className={`lg:hidden relative flex items-center gap-3 px-3 py-3 rounded-xl opacity-70 hover:bg-neutral-50 hover:opacity-100 transition-all min-h-[44px]`}
            onClick={onMobileClose}
          >
            <Image
              src="/icons/settings.svg"
              alt="Configurações"
              width={20}
              height={20}
              className="text-neutral-900 shrink-0"
            />
            <span className="text-xs md:text-sm font-semibold text-neutral-900">
              Configurações
            </span>
          </Link>
        </div>

        <div
          className={`relative py-6 border-t border-neutral-100 ${isCollapsed ? "px-1" : "px-2"}`}
          ref={menuRef}
        >
          <div
            className={`flex items-center gap-1 ${isCollapsed ? "lg:justify-center" : ""}`}
          >
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
              {user?.role === "collaborator" && user?.account?.ownerName && (
                <span
                  className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-teal-600 truncate"
                  title={`Você faz parte da equipe de ${user.account.ownerName}`}
                >
                  <Users className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Equipe de {user.account.ownerName}
                  </span>
                </span>
              )}
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

          {isMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-neutral-100 rounded-xl shadow-lg overflow-hidden">
              <Link
                href="/configuracoes"
                onClick={closeMenu}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <Image
                  src="/icons/settings.svg"
                  alt="Configurações"
                  width={20}
                  height={20}
                  className="text-neutral-900 shrink-0"
                />
                <span className="text-xs md:text-sm text-neutral-900">
                  Configurações
                </span>
              </Link>
              <div className="h-px bg-neutral-100 mx-3" />
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
