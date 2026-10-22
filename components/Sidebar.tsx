"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useCallback, useState, useEffect } from "react";
import { useToggle, useClickOutside } from "@/hooks";
import { cn, getInitials, getDisplayName, getAvatarColor } from "@/lib/utils";
import { useUserAvatarUrl } from "@/hooks/useUserAvatarUrl";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import {
  CADASTROS_HREFS,
  NAV_GROUP_META,
  NAV_ITEMS,
  NAV_SECTION_LABELS,
  navItemPermission,
  Permission,
  type NavSection,
} from "@/lib/permissions";

interface MenuItem {
  type: "item";
  icon: LucideIcon;
  label: string;
  href: string;
  permission?: Permission;
}

interface MenuGroup {
  type: "group";
  icon: LucideIcon;
  label: string;
  children: MenuItem[];
  permission?: Permission;
}

type NavigationEntry = MenuItem | MenuGroup;

interface MenuSection {
  id: NavSection;
  label: string | null;
  entries: NavigationEntry[];
}

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

export function filterMenuSections(
  sections: MenuSection[],
  can: (permission: Permission) => boolean,
): MenuSection[] {
  return sections
    .map((section) => ({
      ...section,
      entries: filterMenuItems(section.entries, can),
    }))
    .filter((section) => section.entries.length > 0);
}

function buildMenuSections(): MenuSection[] {
  const sections: MenuSection[] = [];
  for (const item of NAV_ITEMS) {
    let section = sections.find((s) => s.id === item.section);
    if (!section) {
      section = {
        id: item.section,
        label: NAV_SECTION_LABELS[item.section],
        entries: [],
      };
      sections.push(section);
    }
    const entry: MenuItem = {
      type: "item",
      icon: item.icon,
      label: item.label,
      href: item.href,
      permission: navItemPermission(item) ?? undefined,
    };
    if (!item.group) {
      section.entries.push(entry);
      continue;
    }
    const meta = NAV_GROUP_META[item.group];
    let group = section.entries.find(
      (e): e is MenuGroup => e.type === "group" && e.label === meta.label,
    );
    if (!group) {
      group = {
        type: "group",
        icon: meta.icon,
        label: meta.label,
        children: [],
      };
      section.entries.push(group);
    }
    group.children.push(entry);
  }
  return sections;
}

const allMenuSections = buildMenuSections();

const isCadastrosPath = (pathname: string) =>
  CADASTROS_HREFS.some(
    (basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`),
  );

const itemClasses = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm transition-colors duration-200",
    active
      ? "bg-primary-50 font-medium text-primary-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
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

  const menuSections = filterMenuSections(allMenuSections, can);

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
          className={cn(
            "flex items-center gap-2.5 py-2 justify-between px-4",
            isCollapsed && "lg:justify-center lg:px-2",
          )}
        >
          <Image
            src="/brand/icon.png"
            alt="Inexci"
            width={32}
            height={32}
            className={cn("object-contain", isCollapsed && "lg:hidden")}
          />

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
          aria-label="Menu principal"
          className="flex-1 overflow-y-auto pt-4 px-1"
        >
          {menuSections.map((section, index) => (
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

              {section.entries.map((item) => {
                if (item.type === "group") {
                  const isGroupActive = item.children.some((child) =>
                    isRouteActive(child.href),
                  );
                  const GroupIcon = item.icon;

                  return (
                    <div key={item.label} className="flex flex-col gap-0.5">
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
                        aria-expanded={isCadastrosOpen && !isCollapsed}
                        className={cn(
                          itemClasses(
                            isGroupActive && (!isCadastrosOpen || isCollapsed),
                          ),
                          "w-full",
                          isGroupActive &&
                            isCadastrosOpen &&
                            !isCollapsed &&
                            "text-gray-900",
                          isCollapsed && "lg:justify-center",
                        )}
                        title={isCollapsed ? item.label : undefined}
                        data-tour="cadastros-menu"
                      >
                        <GroupIcon
                          className="h-5 w-5 shrink-0"
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            "flex-1 text-left",
                            isCollapsed && "lg:hidden",
                          )}
                        >
                          {item.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-gray-400 transition-transform",
                            isCadastrosOpen && "rotate-180",
                            isCollapsed && "lg:hidden",
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {isCadastrosOpen && !isCollapsed && (
                        <div className="ml-5 flex flex-col gap-0.5 border-l border-gray-100 pl-2">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  itemClasses(isRouteActive(child.href)),
                                  "min-h-[40px] py-2",
                                )}
                                aria-current={
                                  isRouteActive(child.href) ? "page" : undefined
                                }
                                onClick={onMobileClose}
                              >
                                <ChildIcon
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = isRouteActive(item.href);
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      itemClasses(isActive),
                      isCollapsed && "lg:justify-center",
                    )}
                    aria-current={isActive ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    onClick={onMobileClose}
                  >
                    <ItemIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className={cn(isCollapsed && "lg:hidden")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-1 px-1 pb-1">
          <NotificationsDropdown isCollapsed={isCollapsed} />

          <Link
            href="/configuracoes"
            className={cn(
              itemClasses(isRouteActive("/configuracoes")),
              "lg:hidden",
            )}
            onClick={onMobileClose}
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Configurações</span>
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
                  unoptimized
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
              type="button"
              onClick={toggleMenu}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors",
                isCollapsed && "lg:hidden",
              )}
              title="Menu"
              aria-label="Menu"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {isMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-neutral-100 rounded-xl shadow-lg overflow-hidden">
              <Link
                href="/configuracoes"
                onClick={closeMenu}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <Settings
                  className="h-5 w-5 shrink-0 text-gray-600"
                  aria-hidden="true"
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
                <LogOut
                  className="h-5 w-5 shrink-0 text-gray-600"
                  aria-hidden="true"
                />
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
