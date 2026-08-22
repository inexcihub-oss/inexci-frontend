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

  const viewer = useMemo<Viewer>(
    () => ({
      permissions: permissions ?? [],
      isDoctor: Boolean(isDoctor),
      isAccountOwner: Boolean(isAccountOwner),
    }),
    [permissions, isDoctor, isAccountOwner],
  );

  const tracks = useMemo(() => visibleTracks(viewer), [viewer]);

  /**
   * `true` só quando ESTA montagem do provider foi quem promoveu o status
   * para `completed` (via `promoteIfComplete`, dentro de `aplicar`). Decisão
   * do controller sobre o achado 4: um `status: "completed"` que já chega
   * pronto do servidor (próximo login) não deve reativar a mensagem de
   * conclusão — só a promoção que aconteceu NESTA sessão ativa. Ver
   * `isChecklistVisible` no `value` abaixo.
   */
  const promovidoNestaSessaoRef = useRef(false);

  /**
   * Persistência otimista: o estado local muda na hora e o PATCH sai com
   * debounce. Uma falha só vira log — o onboarding não pode travar a tela
   * porque marcar um checkbox deu 500.
   *
   * `pendenteRef` guarda um PATCH PARCIAL (só os campos tocados), não mais um
   * snapshot do estado inteiro. Mandar o estado inteiro foi o bug que a
   * revisão final do backend achou: `restartedAt` (campo que só o servidor
   * escreve) ia junto em todo PATCH, o DTO lá rejeita chave desconhecida
   * (`forbidNonWhitelisted`) e devolvia 400 sempre — silenciado pelo `.catch`
   * abaixo, que só loga. Mandar só os campos tocados também resolve um
   * segundo problema: o merge do backend fecha `completedSteps`/`toursSeen`
   * chave a chave, mas ESCALARES são last-write-wins — mandar o snapshot
   * inteiro fazia um dispositivo reenviar `checklistDismissedAt: null` por
   * cima do dispensar feito em outro.
   */
  const pendenteRef = useRef<OnboardingWritablePatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enviarPendente = useCallback(() => {
    const paraEnviar = pendenteRef.current;
    pendenteRef.current = null;
    if (!paraEnviar) return;
    void onboardingService.patch(paraEnviar).catch((erro) => {
      logger.error("Falha ao salvar progresso do onboarding:", erro);
    });
  }, []);

  const agendarPersistencia = useCallback(
    (patch: OnboardingWritablePatch) => {
      pendenteRef.current = mergeOnboardingPatch(pendenteRef.current, patch);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(enviarPendente, DEBOUNCE_MS);
    },
    [enviarPendente],
  );

  /**
   * Ao desmontar (ex.: logout), ENVIA a escrita pendente em vez de só cancelar
   * o timer. Sem isso, "Dispensar" seguido de logout em menos de 500 ms perde
   * o PATCH — o card reaparece no próximo login porque o servidor nunca soube
   * do dismiss. Cancelar o timer continua certo para impedir que esse PATCH
   * vaze para a sessão de OUTRO usuário depois da troca; aqui ele é disparado
   * ANTES de desmontar, com o usuário ainda autenticado.
   */
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      enviarPendente();
    },
    [enviarPendente],
  );

  /**
   * `patch` é o delta que ESTA ação, por si só, toca — quem chama já sabe o
   * que mudou (ex.: `dismiss` só toca `checklistDismissedAt`), então não há
   * por que derivar isso de um diff genérico contra o estado anterior.
   * `aplicar` só adiciona `status` ao patch quando ele muda de fato (seja
   * pelo `avancarStatus` embutido na própria mutação, seja pela promoção a
   * `completed`) — sem isso, toda mutação mandaria `status` de novo mesmo
   * quando ele não mudou.
   */
  const aplicar = useCallback(
    (
      transformar: (atual: OnboardingState) => OnboardingState,
      patch: OnboardingWritablePatch,
    ) => {
      setState((atual) => {
        const transformado = transformar(atual);
        // Promove para "completed" depois de QUALQUER mudança de estado, não
        // só depois de `completeStep`: `closeTour` também escreve em
        // `completedSteps` e é o caminho real que fecha a última trilha.
        const proximo = promoteIfComplete(
          transformado,
          tracks.map((t) => t.stepKey),
        );
        if (proximo.status === "completed" && atual.status !== "completed") {
          promovidoNestaSessaoRef.current = true;
        }
        const patchFinal: OnboardingWritablePatch =
          proximo.status !== atual.status
            ? { ...patch, status: proximo.status }
            : patch;
        agendarPersistencia(patchFinal);
        return proximo;
      });
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
      setActiveTour(null);
      if (!id || !opts?.concluido) return;
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
      isChecklistVisible:
        calcChecklistVisible(state, promovidoNestaSessaoRef.current) &&
        tracks.length > 0,
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
