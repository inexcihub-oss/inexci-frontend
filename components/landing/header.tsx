"use client";
import Link from "next/link";
import { Logo } from "@/components/landing/logo";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/landing/ui/button";
import React from "react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/landing/mode-toggle";
import { APP_URL } from "@/lib/landing/seo";

const menuItems = [
  { name: "Problema", href: "#problemas" },
  { name: "Solução", href: "#solucoes" },
  { name: "Benefícios", href: "#beneficios" },
  { name: "Dúvidas", href: "#duvidas" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "max-w-4xl rounded-2xl border ring-1 ring-border/50 shadow-[0_8px_30px_-12px_rgba(56,189,248,0.15)] supports-[backdrop-filter]:backdrop-blur-md backdrop-saturate-150 bg-background/65 dark:bg-background/45 lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <Logo className="transition filter dark:drop-shadow-[0_0_18px_rgba(56,189,248,0.22)] dark:brightness-110 dark:contrast-110 dark:saturate-125" />
              </Link>

              <button
                data-state={menuState ? "active" : undefined}
                onClick={() => setMenuState((s) => !s)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                aria-expanded={menuState}
                aria-controls="mobile-menu"
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 data-[state=active]:rotate-180 data-[state=active]:scale-0 data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 data-[state=active]:rotate-0 data-[state=active]:scale-100 data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="hidden flex-1 justify-center lg:flex">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className="font-body relative block font-medium text-foreground transition-colors duration-150 hover:text-muted-foreground after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:rounded-full after:bg-gradient-to-r after:from-sky-400 after:to-teal-400 after:transition-all after:duration-300 hover:after:w-full"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="mobile-menu"
              className={cn(
                menuState ? "block" : "hidden",
                "mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent supports-[backdrop-filter]:backdrop-blur-md backdrop-saturate-150 ring-1 ring-border/50 lg:ring-0 bg-background/90 dark:bg-background/70"
              )}
            >
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        onClick={() => setMenuState(false)}
                        href={item.href}
                        className="font-body relative block font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground dark:text-[#cad2dd] dark:hover:text-[#cad2dd]"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit supports-[backdrop-filter]:backdrop-blur-md backdrop-saturate-150">
                <div className="flex items-center gap-2 rounded-xl px-2 py-1 ring-1 ring-border/50 supports-[backdrop-filter]:backdrop-blur-md backdrop-saturate-150 bg-background/65 dark:bg-background/45 shadow-[0_8px_30px_-12px_rgba(56,189,248,0.15)] justify-between">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-lg text-foreground hover:bg-accent/40 transition text-sm font-medium"
                  >
                    <a href={`${APP_URL}/login`}>
                      <span>Entrar</span>
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="h-9 rounded-lg px-4 bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-[0_10px_24px_-10px_rgba(56,189,248,0.6)] ring-1 ring-sky-400/30 hover:scale-[1.01] transition"
                  >
                    <a href={`${APP_URL}/cadastro`} onClick={() => setMenuState(false)}>
                      <span>Criar conta</span>
                    </a>
                  </Button>
                  <ModeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
