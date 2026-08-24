"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const DURACAO_MS = 4500;
const NUM_CONFETES = 40;
const CORES = [
  "#0d9488",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

interface Confete {
  esquerda: number;
  atraso: number;
  duracao: number;
  cor: string;
}

/** Mesmo princípio de `useTargetRect.movimentoReduzido()`. */
function movimentoReduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function gerarConfetes(): Confete[] {
  return Array.from({ length: NUM_CONFETES }, (_, i) => ({
    esquerda: Math.random() * 100,
    atraso: Math.random() * 0.6,
    duracao: 2.2 + Math.random() * 1.3,
    cor: CORES[i % CORES.length],
  }));
}

interface Props {
  /** Chamado sozinho, sem exigir clique, quando a celebração termina. */
  onDone: () => void;
}

/**
 * Celebração de conclusão total do onboarding. `OnboardingGate` monta este
 * componente uma vez, quando o status vira "completed" nesta sessão — não é
 * o card do banner, é um efeito visual passageiro por cima da tela. Some
 * sozinha depois de `DURACAO_MS`; `pointer-events-none` garante que ela
 * nunca atrapalha um clique em algo por baixo.
 */
export function OnboardingCelebration({ onDone }: Props) {
  const [confetes] = useState<Confete[]>(() =>
    movimentoReduzido() ? [] : gerarConfetes(),
  );

  useEffect(() => {
    const id = setTimeout(onDone, DURACAO_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[110] overflow-hidden"
    >
      {confetes.map((confete, indice) => (
        <span
          key={indice}
          aria-hidden="true"
          data-confetti="true"
          className="animate-onboarding-confete absolute top-[-12px] block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${confete.esquerda}%`,
            backgroundColor: confete.cor,
            animationDelay: `${confete.atraso}s`,
            animationDuration: `${confete.duracao}s`,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-primary-950/10 backdrop-blur-[1px]" />

      <div className="absolute left-1/2 top-1/2 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-primary-100 bg-white text-center shadow-2xl">
        <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-teal-500 px-7 pb-10 pt-8 text-white sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/30">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
            Onboarding concluído
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Você está pronto para começar
          </h2>
        </div>
        <div className="relative -mt-4 mx-4 rounded-2xl bg-white px-5 py-5 shadow-lg ring-1 ring-black/5 sm:mx-7 sm:px-7">
          <Sparkles
            className="absolute -right-2 -top-3 h-7 w-7 text-amber-400"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
            Seus primeiros passos foram concluídos. Vamos levar você para sua
            página inicial para continuar o trabalho.
          </p>
        </div>
        <p className="px-6 pb-6 pt-5 text-xs font-medium text-neutral-400 sm:pb-7">
          Esta mensagem fecha automaticamente.
        </p>
      </div>
    </div>
  );
}
