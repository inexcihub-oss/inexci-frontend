"use client";

import { useEffect, useState } from "react";

const DURACAO_MS = 3500;
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
          className="animate-onboarding-confete absolute top-[-12px] block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${confete.esquerda}%`,
            backgroundColor: confete.cor,
            animationDelay: `${confete.atraso}s`,
            animationDuration: `${confete.duracao}s`,
          }}
        />
      ))}

      <div className="absolute left-1/2 top-1/3 w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary-200 bg-white px-5 py-4 text-center shadow-xl">
        <p className="text-sm font-semibold text-primary-950">
          Tudo pronto! Você já pode usar a plataforma.
        </p>
      </div>
    </div>
  );
}
