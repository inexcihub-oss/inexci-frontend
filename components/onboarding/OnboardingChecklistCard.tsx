"use client";

import { Check, ChevronRight } from "lucide-react";
import { CHECKLIST } from "@/lib/onboarding/content";
import { useOnboarding } from "./OnboardingProvider";

export function OnboardingChecklistCard() {
  const { state, tracks, startTour, dismiss, isChecklistVisible } =
    useOnboarding();

  if (!isChecklistVisible || tracks.length === 0) return null;

  const concluidas = tracks.filter(
    (t) => state.completedSteps[t.stepKey],
  ).length;
  const concluido = state.status === "completed";

  return (
    <section
      aria-label={CHECKLIST.titulo}
      className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            {CHECKLIST.titulo}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {`${concluidas} de ${tracks.length}`}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
        >
          {CHECKLIST.dispensar}
        </button>
      </div>

      {concluido ? (
        // O momento de "você terminou": aparece em vez do checklist até o
        // usuário clicar em "Dispensar" — nenhum item ganha destaque
        // aleatório, e o card não some em silêncio assim que a última
        // trilha é marcada.
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          {CHECKLIST.concluido}
        </p>
      ) : (
        <>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={concluidas}
            aria-valuemin={0}
            aria-valuemax={tracks.length}
          >
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${(concluidas / tracks.length) * 100}%` }}
            />
          </div>

          <ul className="mt-4 space-y-1">
            {tracks.map((track) => {
              const feito = Boolean(state.completedSteps[track.stepKey]);
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => startTour(track.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-neutral-50"
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                        feito
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {feito && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          feito
                            ? "text-neutral-400 line-through"
                            : "text-neutral-900"
                        }`}
                      >
                        {track.label}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {track.descricao}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1 text-xs font-semibold text-neutral-700">
                      {feito ? CHECKLIST.refazer : CHECKLIST.ver}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
