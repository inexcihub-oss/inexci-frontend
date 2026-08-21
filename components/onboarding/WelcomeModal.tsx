"use client";

import { useMemo, useState } from "react";
import { BOAS_VINDAS, SEU_PAPEL } from "@/lib/onboarding/content";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { useOnboarding } from "./OnboardingProvider";

interface Props {
  onFinish: () => void;
}

export function WelcomeModal({ onFinish }: Props) {
  const { markWelcome, viewer } = useOnboarding();
  const [slide, setSlide] = useState(0);

  /**
   * O terceiro slide é montado a partir das áreas do usuário: o médico lê
   * sobre atender, o assistente de agenda lê sobre marcar consultas. Sem área
   * nenhuma (colaborador recém-criado), cai numa linha genérica — nunca num
   * slide vazio.
   */
  const seuPapel = useMemo(() => {
    const linhas = ALL_PERMISSIONS.filter((p) =>
      viewer.permissions.includes(p),
    ).map((p) => SEU_PAPEL[p]);
    return linhas.length
      ? linhas
      : [
          "Assim que o administrador da conta liberar suas áreas, elas aparecem no menu à esquerda.",
        ];
  }, [viewer.permissions]);

  const slides = [
    ...BOAS_VINDAS.slides,
    { titulo: "O seu papel", corpo: seuPapel.join(" ") },
  ];
  const atual = slides[slide];
  const ehUltimo = slide === slides.length - 1;

  const encerrar = () => {
    markWelcome();
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boas-vindas-titulo"
        className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8"
      >
        <p className="text-xs font-medium text-neutral-400">
          {BOAS_VINDAS.titulo}
        </p>
        <h2
          id="boas-vindas-titulo"
          className="mt-1 text-xl font-semibold text-neutral-900 sm:text-2xl"
        >
          {atual.titulo}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">
          {atual.corpo}
        </p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? "w-6 bg-neutral-900" : "w-1.5 bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={encerrar}
            className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
          >
            {BOAS_VINDAS.pular}
          </button>
          <button
            type="button"
            onClick={() => (ehUltimo ? encerrar() : setSlide((s) => s + 1))}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {ehUltimo ? BOAS_VINDAS.comecar : "Avançar"}
          </button>
        </div>
      </div>
    </div>
  );
}
