"use client";
import React from "react";
import { Button } from "@/components/landing/ui/button";
import Image from "next/image";
import { HeroHeader } from "@/components/landing/header";
import appImage from "@/public/images/app.png";
import { APP_URL } from "@/lib/landing/seo";

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <section id="home">
          <div className="relative pt-12 md:pt-24 [--fade-mask:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [mask-image:var(--fade-mask)] [-webkit-mask-image:var(--fade-mask)]">
            <div
              aria-hidden
              className="absolute inset-0 isolate -z-20 contain-strict"
            >
              <div className="pointer-events-none absolute left-1/2 top-[-15%] z-[-1] h-[46rem] w-[95rem] -translate-x-1/2 rounded-full opacity-45 blur-xl sm:blur-2xl lg:blur-3xl dark:opacity-50 [background:radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.28),transparent_60%),radial-gradient(circle_at_70%_40%,rgba(45,212,191,0.28),transparent_55%),radial-gradient(circle_at_50%_70%,rgba(99,102,241,0.22),transparent_60%)]" />
              <div className="pointer-events-none absolute left-1/2 top-20 z-[-1] h-[42rem] w-[80rem] -translate-x-1/2 opacity-40 blur-lg sm:blur-xl lg:blur-2xl dark:opacity-40 [background:conic-gradient(from_140deg_at_50%_50%,rgba(56,189,248,0.4),rgba(45,212,191,0.4),transparent_60%)]" />
              <div className="pointer-events-none absolute left-1/2 top-36 z-[-1] h-[22rem] w-[46rem] -translate-x-1/2 rounded-full opacity-70 blur-lg sm:blur-xl lg:blur-2xl dark:opacity-80 [background:radial-gradient(closest-side,rgba(56,189,248,0.26),transparent_70%)]" />
              <div className="pointer-events-none absolute inset-0 z-[-1] opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] [background-image:linear-gradient(rgba(120,120,120,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(120,120,120,0.18)_1px,transparent_1px)] bg-[size:36px_36px] dark:opacity-[0.22]" />
            </div>

            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_78%)]"
            />

            <div className="mx-auto px-6 mobile-text-bump">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <h1 className="font-heading mx-auto mt-8 max-w-4xl text-balance leading-[1.1] text-h1 font-semibold text-[var(--brand)] lg:mt-16">
                  Assuma o controle das suas solicitações cirúrgicas
                </h1>
                <p className="font-body mx-auto mt-3 max-w-2xl text-balance text-body text-[20px] sm:text-base font-medium text-[#1E1F25] dark:text-[#F9FAFB]">
                  A primeira plataforma brasileira que centraliza e automatiza
                  toda a gestão de solicitações cirúrgicas.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl px-8 bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-[0_10px_24px_-10px_rgba(56,189,248,0.6)] ring-1 ring-sky-400/30 hover:scale-[1.01] transition text-base font-semibold"
                  >
                    <a href={`${APP_URL}/cadastro`}>Criar conta grátis</a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-xl px-8 text-base font-semibold border-border hover:bg-accent/40 transition"
                  >
                    <a href={`${APP_URL}/login`}>Entrar na plataforma</a>
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="mask-b-from-55% relative mr-0 mt-8 overflow-hidden px-2 sm:mt-12 md:mt-20">
                <div className="group relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-2 lg:p-4 md:p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background dark:inset-shadow-white/20 bg-background">
                  <div className="pointer-events-none absolute inset-px z-[1] opacity-60 [mask-image:linear-gradient(to_bottom,white,transparent_65%)]" />
                  <Image
                    className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border w-full h-full object-contain"
                    src={appImage}
                    placeholder="blur"
                    alt="Inexci Plataform"
                    width={1840}
                    height={1148}
                    sizes="(max-width: 640px) 92vw, (max-width: 768px) 92vw, (max-width: 1024px) 90vw, (max-width: 1280px) 1056px, 1152px"
                    quality={70}
                    priority
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
