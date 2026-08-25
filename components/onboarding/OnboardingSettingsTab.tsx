"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { CHECKLIST } from "@/lib/onboarding/content";
import { logger } from "@/lib/logger";
import { resolveHome } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "./OnboardingProvider";

export function OnboardingSettingsTab() {
  const { state, tracks, startTour, restart } = useOnboarding();
  const { permissions } = useAuth();
  const router = useRouter();
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
      // A home é sempre calculada pelas permissões efetivas. Para médicos,
      // ela é Atendimento; nunca uma rota fixa que possa estar bloqueada.
      router.push(resolveHome(permissions ?? []));
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
        <h2 className="ds-section-title text-base md:text-lg">
          {CHECKLIST.titulo}
        </h2>
        <p className="ds-caption mt-1 text-sm">
          {tracks.length > 0
            ? `Você concluiu ${concluidas} de ${tracks.length}. Rode qualquer um de novo quando quiser.`
            : "As trilhas aparecem aqui conforme as áreas liberadas para você."}
        </p>
      </div>

      {tracks.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
            <h3 className="ds-section-title">Trilhas disponíveis</h3>
            <p className="ds-caption">Aprenda o essencial por área da plataforma.</p>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {tracks.map((track) => {
                const feito = Boolean(state.completedSteps[track.stepKey]);
                return (
                  <li
                    key={track.id}
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-6"
                  >
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border ${
                        feito
                          ? "border-primary-600 bg-primary-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {feito && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        {track.label}
                      </span>
                      <span className="block text-xs leading-5 text-gray-500">
                        {track.descricao}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startTour(track.id)}
                      className="shrink-0 border-gray-200 text-gray-700"
                    >
                      {feito ? CHECKLIST.refazer : CHECKLIST.ver}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
          <h3 className="ds-section-title">Refazer o onboarding</h3>
          <p className="ds-caption mt-1">
            Zera o progresso e reabre as boas-vindas na sua tela inicial.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <Button
            type="button"
            onClick={aoRefazer}
            disabled={reiniciando}
            variant="primary"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {reiniciando ? "Reiniciando…" : "Refazer o onboarding"}
          </Button>
          {erro && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {CHECKLIST.erroReiniciar}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
