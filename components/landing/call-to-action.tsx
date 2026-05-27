"use client";
import { Button } from "@/components/landing/ui/button";
import { APP_URL } from "@/lib/landing/seo";

export default function CallToAction() {
  return (
    <section className="relative overflow-hidden py-12 cv-auto mobile-text-bump">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25),transparent_60%)] blur-3xl" />
        <div className="absolute left-1/2 top-24 h-96 w-[30rem] -translate-x-1/2 rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,rgba(56,189,248,0.20),rgba(45,212,191,0.20),transparent_60%)] blur-2xl" />
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center space-y-6">
          <h2 className="text-4xl lg:text-6xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Transforme a gestão das suas solicitações cirúrgicas
            </span>
          </h2>
          <p className="text-[17px] sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Reduza cancelamentos, acelere aprovações e tenha previsibilidade
            do centro cirúrgico. Comece agora mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl px-8 bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-[0_10px_24px_-10px_rgba(56,189,248,0.55)] ring-1 ring-sky-400/30 hover:scale-[1.01] hover:shadow-[0_18px_40px_-12px_rgba(56,189,248,0.7)] transition text-base font-semibold"
            >
              <a href={`${APP_URL}/cadastro`}>Criar conta grátis</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl px-8 text-base font-semibold border-border hover:bg-accent/40 transition"
            >
              <a href={`${APP_URL}/login`}>Já tenho conta</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
