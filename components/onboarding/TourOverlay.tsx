"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { TOUR_UI } from "@/lib/onboarding/content";
import type { TrackId } from "@/lib/onboarding/state";
import { trackById, visibleSteps } from "@/lib/onboarding/tour-registry";
import { useOnboarding } from "./OnboardingProvider";
import { useTargetRect } from "./useTargetRect";

const PADDING_FURO = 8;
const LARGURA_BALAO = 320;
const MARGEM = 16;

interface Props {
  trackId: TrackId;
  onClose: (opts?: { concluido?: boolean }) => void;
}

export function TourOverlay({ trackId, onClose }: Props) {
  const router = useRouter();
  const { viewer } = useOnboarding();
  const [indice, setIndice] = useState(0);
  const [montado, setMontado] = useState(false);
  const balaoRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

  const track = trackById(trackId);
  const passos = useMemo(
    () => (track ? visibleSteps(track, viewer) : []),
    [track, viewer],
  );
  const passo = passos[indice];

  const { rect, estado } = useTargetRect(passo?.target);

  // Passo com `route` navega antes de procurar o alvo.
  useEffect(() => {
    if (passo?.route) router.push(passo.route);
  }, [passo?.route, router]);

  const avancar = useCallback(() => {
    setIndice((i) => {
      if (i >= passos.length - 1) {
        onClose({ concluido: true });
        return i;
      }
      return i + 1;
    });
  }, [passos.length, onClose]);

  const voltar = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  /**
   * Degradação por alvo ausente. `required: false` (padrão) pula o passo em
   * silêncio: alvos somem por motivos rotineiros e travar o tour aí é pior do
   * que seguir sem aquele destaque. `required: true` encerra com aviso.
   */
  useEffect(() => {
    if (estado !== "ausente" || !passo?.target) return;
    if (passo.required) {
      onClose();
      return;
    }
    avancar();
  }, [estado, passo?.target, passo?.required, avancar, onClose]);

  // Teclado: Esc sai, setas navegam.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onClose();
      } else if (evento.key === "ArrowRight") {
        avancar();
      } else if (evento.key === "ArrowLeft") {
        voltar();
      } else if (evento.key === "Tab") {
        // Foco preso no balão: fora dele está a página real, e deixar o Tab
        // escapar faz o usuário perder de vista onde estava o tour.
        const foco = balaoRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
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
  }, [avancar, voltar, onClose]);

  useEffect(() => {
    balaoRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [indice]);

  const posicaoBalao = useMemo(() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }
    const alturaEstimada = 190;
    const cabeAbaixo =
      rect.bottom + MARGEM + alturaEstimada < window.innerHeight;
    const top = cabeAbaixo
      ? rect.bottom + MARGEM
      : Math.max(MARGEM, rect.top - MARGEM - alturaEstimada);
    const left = Math.min(
      Math.max(MARGEM, rect.left),
      Math.max(MARGEM, window.innerWidth - LARGURA_BALAO - MARGEM),
    );
    return { top, left } as const;
  }, [rect]);

  if (!montado || !track || !passo) return null;
  if (estado === "buscando") return null;

  const tituloId = `tour-${trackId}-${passo.key}`;
  const ehUltimo = indice === passos.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-furo">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PADDING_FURO}
                y={rect.top - PADDING_FURO}
                width={rect.width + PADDING_FURO * 2}
                height={rect.height + PADDING_FURO * 2}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgb(10 10 10 / 0.55)"
          mask="url(#tour-furo)"
        />
      </svg>

      <div
        ref={balaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        style={{ ...posicaoBalao, width: LARGURA_BALAO }}
        className="absolute rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
      >
        <button
          type="button"
          onClick={() => onClose()}
          className="mb-3 text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          {TOUR_UI.sair}
        </button>

        <p className="text-xs font-medium text-neutral-400">
          {`${indice + 1} de ${passos.length}`}
        </p>
        <h3
          id={tituloId}
          className="mt-1 text-base font-semibold text-neutral-900"
        >
          {passo.titulo}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {passo.corpo}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          {indice > 0 && (
            <button
              type="button"
              onClick={voltar}
              className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              {TOUR_UI.anterior}
            </button>
          )}
          <button
            type="button"
            onClick={avancar}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {ehUltimo ? TOUR_UI.concluir : TOUR_UI.proximo}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
