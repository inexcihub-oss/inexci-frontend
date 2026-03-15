"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

interface NavItem {
  iconSrc: string;
  iconActiveSrc?: string;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  {
    iconSrc: "/icons/dashboard.svg",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    iconSrc: "/icons/grid-layout.svg",
    label: "Solicitações",
    href: "/solicitacoes-cirurgicas",
  },
  {
    iconSrc: "/icons/user-add.svg",
    label: "Pacientes",
    href: "/pacientes",
  },
  {
    iconSrc: "/icons/user-profile.svg",
    label: "Equipe",
    href: "/colaboradores",
  },
  {
    iconSrc: "/icons/settings.svg",
    label: "Mais",
    href: "/configuracoes",
  },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [ripple, setRipple] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  const handleTap = (href: string) => {
    setRipple(href);
    setTimeout(() => setRipple(null), 300);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-lg border-t border-neutral-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-1 h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleTap(item.href)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 flex-1
                py-1.5 rounded-2xl transition-all duration-200
                min-h-[44px] min-w-[44px]
                ${active ? "text-primary-600" : "text-neutral-200 hover:text-neutral-900"}
                ${ripple === item.href ? "scale-95" : "scale-100"}
              `}
            >
              {/* Active indicator dot */}
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
                  active ? "text-primary-600 font-semibold" : "text-neutral-200"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
