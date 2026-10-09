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
  markAllComplete,
  markStepComplete,
  markTourSeen,
  markWelcomeSeen,
  mergeOnboardingPatch,
  normalizeOnboardingState,
  promoteIfComplete,
  type OnboardingState,
  type OnboardingWritablePatch,
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
  completeAll: () => void;
  markWelcome: () => void;
  dismiss: () => void;
  restart: () => Promise<void>;
  isChecklistVisible: boolean;
  emTour: boolean;
  registrarAcao: (id: string, fn: () => void) => void;
  desregistrarAcao: (id: string) => void;
  executarAcao: (id: string) => boolean;
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

  const stateRef = useRef(state);

  const usuarioIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    if (user?.id !== usuarioIdRef.current) {
      usuarioIdRef.current = user?.id ?? null;
      const doUsuario = normalizeOnboardingState(user?.onboardingState);
      stateRef.current = doUsuario;
      setState(doUsuario);
    }
  }, [user?.id, user?.onboardingState]);

  const viewer = useMemo<Viewer>(
    () => ({
      permissions: permissions ?? [],
      isDoctor: Boolean(isDoctor),
      isAccountOwner: Boolean(isAccountOwner),
    }),
    [permissions, isDoctor, isAccountOwner],
  );

  const tracks = useMemo(() => visibleTracks(viewer), [viewer]);

  const acoesRef = useRef(new Map<string, () => void>());

  const pendenteRef = useRef<OnboardingWritablePatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escritaEmVooRef = useRef<Promise<void> | null>(null);

  const enviarPendente = useCallback((): Promise<void> => {
    const paraEnviar = pendenteRef.current;
    pendenteRef.current = null;
    if (!paraEnviar) return escritaEmVooRef.current ?? Promise.resolve();

    const salvar = async () => {
      try {
        await onboardingService.patch(paraEnviar);
      } catch (erro) {
        logger.error("Falha ao salvar progresso do onboarding:", erro);
      }
    };
    const anterior = escritaEmVooRef.current;
    const envio = anterior ? anterior.catch(() => undefined).then(salvar) : salvar();
    let rastreado: Promise<void>;
    rastreado = envio.finally(() => {
      if (escritaEmVooRef.current === rastreado) {
        escritaEmVooRef.current = null;
      }
    });
    escritaEmVooRef.current = rastreado;
    return rastreado;
  }, []);

  const agendarPersistencia = useCallback(
    (patch: OnboardingWritablePatch) => {
      pendenteRef.current = mergeOnboardingPatch(pendenteRef.current, patch);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(enviarPendente, DEBOUNCE_MS);
    },
    [enviarPendente],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      enviarPendente();
    },
    [enviarPendente],
  );

  const aplicar = useCallback(
    (
      transformar: (atual: OnboardingState) => OnboardingState,
      patch: OnboardingWritablePatch,
    ) => {
      const atual = stateRef.current;
      const transformado = transformar(atual);
      const proximo = promoteIfComplete(
        transformado,
        tracks.map((t) => t.stepKey),
      );
      const patchFinal: OnboardingWritablePatch =
        proximo.status !== atual.status
          ? { ...patch, status: proximo.status }
          : patch;

      stateRef.current = proximo;
      setState(proximo);
      agendarPersistencia(patchFinal);
    },
    [agendarPersistencia, tracks],
  );

  const completeStep = useCallback(
    (key: StepKey) => {
      const agora = new Date().toISOString();
      aplicar((atual) => markStepComplete(atual, key, agora), {
        completedSteps: { [key]: agora },
      });
    },
    [aplicar],
  );

  const completeAll = useCallback(() => {
    const agora = new Date().toISOString();
    const atual = stateRef.current;
    const faltando = tracks
      .map((t) => t.stepKey)
      .filter((k) => !atual.completedSteps[k]);
    if (faltando.length === 0) return;
    aplicar(
      (estado) => markAllComplete(estado, faltando, agora),
      {
        completedSteps: Object.fromEntries(faltando.map((k) => [k, agora])),
        ...(atual.welcomeSeenAt ? {} : { welcomeSeenAt: agora }),
      },
    );
  }, [aplicar, tracks]);

  const markWelcome = useCallback(() => {
    const agora = new Date().toISOString();
    aplicar((atual) => markWelcomeSeen(atual, agora), {
      welcomeSeenAt: agora,
    });
  }, [aplicar]);

  const dismiss = useCallback(() => {
    const agora = new Date().toISOString();
    aplicar((atual) => dismissChecklist(atual, agora), {
      checklistDismissedAt: agora,
    });
  }, [aplicar]);

  const startTour = useCallback((id: TrackId) => setActiveTour(id), []);

  const closeTour = useCallback(
    (opts?: { concluido?: boolean }) => {
      const id = activeTour;
      if (!id || !opts?.concluido) {
        setActiveTour(null);
        return;
      }
      const track = tracks.find((t) => t.id === id);
      const agora = new Date().toISOString();
      aplicar(
        (atual) => {
          const comTrilha = markTourSeen(atual, id, agora);
          return track
            ? markStepComplete(comTrilha, track.stepKey, agora)
            : comTrilha;
        },
        track
          ? {
              toursSeen: { [id]: agora },
              completedSteps: { [track.stepKey]: agora },
            }
          : { toursSeen: { [id]: agora } },
      );
      const proxima = tracks.find(
        (t) => !stateRef.current.completedSteps[t.stepKey],
      );
      setActiveTour(proxima?.id ?? null);
    },
    [activeTour, tracks, aplicar],
  );

  const restart = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    await enviarPendente();

    const novo = await onboardingService.reset();
    const normalizado = normalizeOnboardingState(novo);
    stateRef.current = normalizado;
    setState(normalizado);
    setActiveTour(null);
  }, [enviarPendente]);

  const registrarAcao = useCallback((id: string, fn: () => void) => {
    acoesRef.current.set(id, fn);
  }, []);

  const desregistrarAcao = useCallback((id: string) => {
    acoesRef.current.delete(id);
  }, []);

  const executarAcao = useCallback((id: string): boolean => {
    const fn = acoesRef.current.get(id);
    if (!fn) return false;
    fn();
    return true;
  }, []);

  const value = useMemo<OnboardingContextData>(
    () => ({
      state,
      tracks,
      viewer,
      activeTour,
      emTour: activeTour !== null,
      startTour,
      closeTour,
      completeStep,
      completeAll,
      markWelcome,
      dismiss,
      restart,
      registrarAcao,
      desregistrarAcao,
      executarAcao,
      isChecklistVisible:
        calcChecklistVisible(state) && tracks.length > 0,
    }),
    [
      state,
      tracks,
      viewer,
      activeTour,
      startTour,
      closeTour,
      completeStep,
      completeAll,
      markWelcome,
      dismiss,
      restart,
      registrarAcao,
      desregistrarAcao,
      executarAcao,
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
