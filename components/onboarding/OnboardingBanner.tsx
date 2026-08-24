"use client";

import { Compass, X } from "lucide-react";
import { CHECKLIST } from "@/lib/onboarding/content";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useOnboarding } from "./OnboardingProvider";

/**
 * Banner global de "Primeiros passos" — mesma anatomia do `QuotaBanner`
 * (`GlobalBanners`), só que em teal para não se confundir com aviso de
 * cobrança. Ao contrário do card antigo, não lista as trilhas: mostra só o
 * progresso agregado e a PRÓXIMA trilha incompleta, com um único CTA. A lista
 * completa continua em `OnboardingSettingsTab`.
 */
export function OnboardingBanner() {
  const { state, tracks, startTour, dismiss, isChecklistVisible } =
    useOnboarding();

  // A conclusão é celebrada pelo overlay próprio. Manter este banner nessa
  // transição deixava uma camada visual presa no topo da tela.
  if (
    !isChecklistVisible ||
    tracks.length === 0 ||
    state.status === "completed"
  ) {
    return null;
  }

  const concluidas = tracks.filter(
    (t) => state.completedSteps[t.stepKey],
  ).length;
  const proximaTrilha = tracks.find((t) => !state.completedSteps[t.stepKey]);

  return (
    <div
      role="region"
      aria-label="Primeiros passos"
      className="bg-white px-3 py-3 sm:px-4 sm:py-4"
    >
      <div
        role="status"
        aria-live="polite"
        className="relative mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-2xl border border-primary-200/90 bg-gradient-to-r from-primary-50 via-white to-primary-50/60 p-3 text-primary-950 shadow-sm sm:p-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5">
            <Compass className="h-5 w-5 shrink-0 text-primary-600" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="pr-8 text-sm font-semibold sm:text-[15px] md:pr-0">
              {CHECKLIST.titulo}
            </p>

            <div
              role="progressbar"
              aria-valuenow={concluidas}
              aria-valuemin={0}
              aria-valuemax={tracks.length}
              className="mt-2 flex items-center gap-2"
            >
              <ProgressBar
                value={(concluidas / tracks.length) * 100}
                size="sm"
                variant="primary"
                className="min-w-0 flex-1"
              />
              <span className="shrink-0 text-xs font-medium tabular-nums opacity-80">
                {`${concluidas} de ${tracks.length}`}
              </span>
            </div>

            {proximaTrilha && (
              <p className="mt-1.5 text-xs leading-relaxed opacity-90 sm:text-sm">
                {`Próximo: ${proximaTrilha.label}`}
              </p>
            )}
          </div>
        </div>

        {proximaTrilha && (
          <button
            type="button"
            onClick={() => startTour(proximaTrilha.id)}
            className="inline-flex min-h-[40px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 md:min-h-[38px] md:w-auto"
          >
            Continuar
          </button>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar primeiros passos"
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 md:static md:h-8 md:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
