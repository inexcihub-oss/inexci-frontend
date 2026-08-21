"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import {
  dismissChecklist,
  isChecklistVisible as calcChecklistVisible,
  markStepComplete,
  markTourSeen,
  markWelcomeSeen,
  normalizeOnboardingState,
  type OnboardingState,
  type StepKey,
  type TrackId,
} from "@/lib/onboarding/state";
import {
  visibleTracks,
  type Track,
  type Viewer,
} from "@/lib/onboarding/tour-registry";
import { onboardingService } from "@/services/onboarding.service";

const DEBOUNCE_MS = 500;

interface OnboardingContextData {
  state: OnboardingState;
  tracks: Track[];
  viewer: Viewer;
  activeTour: TrackId | null;
  startTour: (id: TrackId) => void;
  closeTour: (opts?: { concluido?: boolean }) => void;
  completeStep: (key: StepKey) => void;
  markWelcome: () => void;
  dismiss: () => void;
  restart: () => Promise<void>;
  isChecklistVisible: boolean;
}

const OnboardingContext = createContext<OnboardingContextData | undefined>(
  undefined,
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, permissions, isDoctor, isAccountOwner } = useAuth();

  const [state, setState] = useState<OnboardingState>(() =>
    normalizeOnboardingState(user?.onboardingState),
  );
  const [activeTour, setActiveTour] = useState<TrackId | null>(null);

  // O estado chega embutido no /auth/me. Ressincroniza quando o usuário
  // troca (login/logout) sem disparar request extra.
  const usuarioIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    if (user?.id !== usuarioIdRef.current) {
      usuarioIdRef.current = user?.id ?? null;
      setState(normalizeOnboardingState(user?.onboardingState));
    }
  }, [user?.id, user?.onboardingState]);

  /**
   * Persistência otimista: o estado local muda na hora e o PATCH sai com
   * debounce. Uma falha só vira log — o onboarding não pode travar a tela
   * porque marcar um checkbox deu 500.
   */
  const pendenteRef = useRef<OnboardingState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agendarPersistencia = useCallback((proximo: OnboardingState) => {
    pendenteRef.current = proximo;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const paraEnviar = pendenteRef.current;
      pendenteRef.current = null;
      if (!paraEnviar) return;
      const { version: _version, ...patch } = paraEnviar;
      void onboardingService.patch(patch).catch((erro) => {
        logger.error("Falha ao salvar progresso do onboarding:", erro);
      });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const aplicar = useCallback(
    (transformar: (atual: OnboardingState) => OnboardingState) => {
      setState((atual) => {
        const proximo = transformar(atual);
        agendarPersistencia(proximo);
        return proximo;
      });
    },
    [agendarPersistencia],
  );

  const viewer = useMemo<Viewer>(
    () => ({
      permissions: permissions ?? [],
      isDoctor: Boolean(isDoctor),
      isAccountOwner: Boolean(isAccountOwner),
    }),
    [permissions, isDoctor, isAccountOwner],
  );

  const tracks = useMemo(() => visibleTracks(viewer), [viewer]);

  const completeStep = useCallback(
    (key: StepKey) =>
      aplicar((atual) => markStepComplete(atual, key, new Date().toISOString())),
    [aplicar],
  );

  const markWelcome = useCallback(
    () =>
      aplicar((atual) => markWelcomeSeen(atual, new Date().toISOString())),
    [aplicar],
  );

  const dismiss = useCallback(
    () =>
      aplicar((atual) => dismissChecklist(atual, new Date().toISOString())),
    [aplicar],
  );

  const startTour = useCallback((id: TrackId) => setActiveTour(id), []);

  const closeTour = useCallback(
    (opts?: { concluido?: boolean }) => {
      const id = activeTour;
      setActiveTour(null);
      if (!id || !opts?.concluido) return;
      const track = tracks.find((t) => t.id === id);
      aplicar((atual) => {
        const agora = new Date().toISOString();
        const comTrilha = markTourSeen(atual, id, agora);
        return track ? markStepComplete(comTrilha, track.stepKey, agora) : comTrilha;
      });
    },
    [activeTour, tracks, aplicar],
  );

  const restart = useCallback(async () => {
    // Cancela a escrita pendente ANTES de resetar. Sem isto, um PATCH agendado
    // meio segundo atrás dispara depois do reset e regrava o estado velho por
    // cima — para o usuário, o botão "Refazer" simplesmente não funcionou.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendenteRef.current = null;

    // Reset é ação deliberada do usuário: vai direto, sem debounce, e o
    // servidor é a fonte da verdade do estado resultante.
    const novo = await onboardingService.reset();
    setState(normalizeOnboardingState(novo));
    setActiveTour(null);
  }, []);

  const value = useMemo<OnboardingContextData>(
    () => ({
      state,
      tracks,
      viewer,
      activeTour,
      startTour,
      closeTour,
      completeStep,
      markWelcome,
      dismiss,
      restart,
      isChecklistVisible: calcChecklistVisible(state) && tracks.length > 0,
    }),
    [
      state,
      tracks,
      viewer,
      activeTour,
      startTour,
      closeTour,
      completeStep,
      markWelcome,
      dismiss,
      restart,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextData {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding precisa estar dentro de OnboardingProvider");
  }
  return ctx;
}
