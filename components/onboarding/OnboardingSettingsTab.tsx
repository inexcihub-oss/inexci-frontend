"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { CHECKLIST } from "@/lib/onboarding/content";
import { logger } from "@/lib/logger";
import { useOnboarding } from "./OnboardingProvider";

export function OnboardingSettingsTab() {
  const { state, tracks, startTour, restart } = useOnboarding();
  const [reiniciando, setReiniciando] = useState(false);
  const [erro, setErro] = useState(false);

  const concluidas = tracks.filter(
    (t) => state.completedSteps[t.stepKey],
  ).length;

  const aoRefazer = async () => {
    setReiniciando(true);
    setErro(false);
    try {
      await restart();
    } catch (e) {
      // Reiniciar é a ÚNICA ação que torna "pular" reversível. Falhar em
      // silêncio faz o usuário clicar, não ver nada acontecer e concluir que a
      // funcionalidade está quebrada — pior do que não ter o botão.
      logger.error("Falha ao reiniciar o onboarding:", e);
      setErro(true);
    } finally {
      setReiniciando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          {CHECKLIST.titulo}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {tracks.length > 0
            ? `Você concluiu ${concluidas} de ${tracks.length}. Rode qualquer um de novo quando quiser.`
            : "As trilhas aparecem aqui conforme as áreas liberadas para você."}
        </p>
      </div>

      {tracks.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {tracks.map((track) => {
            const feito = Boolean(state.completedSteps[track.stepKey]);
            return (
              <li
                key={track.id}
                className="flex items-center gap-3 px-4 py-3.5"
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
                  <span className="block text-sm font-medium text-neutral-900">
                    {track.label}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {track.descricao}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => startTour(track.id)}
                  className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {feito ? CHECKLIST.refazer : CHECKLIST.ver}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-900">
          Refazer o onboarding
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Zera o progresso e traz de volta as boas-vindas e o card de primeiros
          passos na sua tela inicial.
        </p>
        <button
          type="button"
          onClick={aoRefazer}
          disabled={reiniciando}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          {reiniciando ? "Reiniciando…" : "Refazer o onboarding"}
        </button>
        {erro && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {CHECKLIST.erroReiniciar}
          </p>
        )}
      </div>
    </div>
  );
}
