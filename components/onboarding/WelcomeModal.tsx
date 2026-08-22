"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { BOAS_VINDAS, SEU_PAPEL } from "@/lib/onboarding/content";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { useOnboarding } from "./OnboardingProvider";

interface Props {
  onFinish: () => void;
}

export function WelcomeModal({ onFinish }: Props) {
  const { markWelcome, viewer } = useOnboarding();
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  /**
   * O terceiro slide é montado a partir das áreas do usuário: o médico lê
   * sobre atender, o assistente de agenda lê sobre marcar consultas. Sem área
   * nenhuma (colaborador recém-criado), cai numa linha genérica — nunca num
   * slide vazio.
   */
  const seuPapelLinhas = useMemo(() => {
    const linhas = ALL_PERMISSIONS.filter((p) =>
      viewer.permissions.includes(p),
    ).map((p) => SEU_PAPEL[p]);
    return linhas.length
      ? linhas
      : [
          "Assim que o administrador da conta liberar suas áreas, elas aparecem no menu à esquerda.",
        ];
  }, [viewer.permissions]);

  const temMultiplasAreas = seuPapelLinhas.length > 1;

  const slides = [
    ...BOAS_VINDAS.slides,
    { titulo: "O seu papel", corpo: seuPapelLinhas },
  ];
  const atual = slides[slide];
  const ehUltimo = slide === slides.length - 1;

  const encerrar = useCallback(() => {
    markWelcome();
    onFinish();
  }, [markWelcome, onFinish]);

  // Foco inicial na montagem e a cada mudança de slide, assim como em
  // TourOverlay. Foca o DIÁLOGO, não o primeiro botão: o primeiro botão é
  // "Pular por agora" (ação dispensiva), e um usuário de teclado que aperta
  // Enter no reflexo ao abrir o diálogo pularia o onboarding sem querer.
  useEffect(() => {
    dialogRef.current?.focus();
  }, [slide]);

  // Teclado: Esc sai, Tab fica preso no diálogo
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        encerrar();
      } else if (evento.key === "Tab") {
        // Tab preso no diálogo: sem deixar sair para a página de trás
        const foco = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], [tabindex]:not([tabindex=\"-1\"])",
        );
        if (!foco?.length) return;
        const primeiro = foco[0];
        const ultimo = foco[foco.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [encerrar]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="boas-vindas-titulo"
        tabIndex={-1}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
      >
        {/*
          Faixa de marca: é o que tira o diálogo de "caixa branca genérica" —
          ícone da INEXCI + eyebrow, antes de qualquer texto de conteúdo.
        */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-primary-50 via-white to-primary-50 px-6 py-5 sm:px-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-primary-100">
            <Image
              src="/brand/icon.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
          <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-primary-800">
            {BOAS_VINDAS.titulo}
          </p>
        </div>

        {/*
          Trilho de progresso segmentado — elemento de assinatura do modal.
          Três segmentos iguais avisam, antes de qualquer leitura, que são só
          três passos curtos: é isso que desarma o reflexo de pular.
        */}
        <div className="flex gap-1 px-6 sm:px-8" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                i <= slide ? "bg-primary-600" : "bg-primary-100"
              }`}
            />
          ))}
        </div>

        {/* Corpo do slide */}
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <h2
            id="boas-vindas-titulo"
            className="text-xl font-semibold text-neutral-900 sm:text-2xl"
          >
            {atual.titulo}
          </h2>

          {/* Renderiza conteúdo diferente se é lista ou parágrafo */}
          {temMultiplasAreas && Array.isArray(atual.corpo) ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
              {atual.corpo.map((linha, idx) => (
                <li key={idx} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <span>{linha}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">
              {Array.isArray(atual.corpo) ? atual.corpo[0] : atual.corpo}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={encerrar}
              className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {BOAS_VINDAS.pular}
            </button>
            <button
              type="button"
              onClick={() => (ehUltimo ? encerrar() : setSlide((s) => s + 1))}
              className="rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {ehUltimo ? BOAS_VINDAS.comecar : BOAS_VINDAS.avancar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
