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

  /**
   * Espelho do estado, lido por `aplicar` no lugar da forma funcional do
   * `setState`. Existe para que os efeitos colaterais (agendar o PATCH) fiquem
   * fora do updater — updater pode reexecutar e roda durante o render. É
   * atualizado em toda escrita, inclusive nas duas
   * fora de `aplicar`, para nunca ficar atrás do estado real.
   */
  const stateRef = useRef(state);

  // O estado chega embutido no /auth/me. Ressincroniza quando o usuário
  // troca (login/logout) sem disparar request extra.
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

  /**
   * Registro de ações do tour por id — o mesmo papel que `data-tour` cumpre
   * para elementos visuais, mas para funções (abrir um modal, trocar um
   * estado interno). Alimentado por `useOnboardingAction`, lido por
   * `TourOverlay` via `executarAcao`.
   */
  const acoesRef = useRef(new Map<string, () => void>());

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
      // Tudo acontece FORA do updater do `setState`. Agendar persistência é
      // efeito colateral em função que o React pode reexecutar (o StrictMode
      // reexecuta) e que roda durante o render —
      // foi o que produzia "Cannot update a component while rendering a
      // different component" quando o `closeTour` era disparado pelo overlay.
      //
      // `stateRef` substitui a forma funcional: ele é atualizado na hora, logo
      // abaixo, então duas chamadas no MESMO tick continuam encadeando sem uma
      // sobrescrever a outra — que era a única vantagem do updater aqui.
      const atual = stateRef.current;
      const transformado = transformar(atual);
      // Promove para "completed" depois de QUALQUER mudança de estado, não
      // só depois de `completeStep`: `closeTour` também escreve em
      // `completedSteps` e é o caminho real que fecha a última trilha.
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
      // Avança sozinho para a próxima trilha incompleta — sem isso, o
      // usuário precisa voltar ao banner de "Primeiros passos" e clicar em
      // "Continuar" de novo a cada trilha concluída. `aplicar` já atualizou
      // `stateRef` de forma síncrona, então este cálculo já enxerga o passo
      // recém-marcado. Mesmo critério do banner (`OnboardingBanner`, "Próxima
      // trilha incompleta").
      const proxima = tracks.find(
        (t) => !stateRef.current.completedSteps[t.stepKey],
      );
      setActiveTour(proxima?.id ?? null);
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
    const normalizado = normalizeOnboardingState(novo);
    const primeiraTrilha = tracks[0];

    if (!primeiraTrilha) {
      stateRef.current = normalizado;
      setState(normalizado);
      setActiveTour(null);
      return;
    }

    // "Refazer" é uma escolha explícita de pular a introdução e voltar
    // direto ao conteúdo. Marca as boas-vindas como vistas e abre a primeira
    // trilha no mesmo fluxo, sem exigir outro clique no banner.
    const agora = new Date().toISOString();
    const recomeçado = markWelcomeSeen(normalizado, agora);
    stateRef.current = recomeçado;
    setState(recomeçado);
    agendarPersistencia({
      welcomeSeenAt: agora,
      status: recomeçado.status,
    });
    setActiveTour(primeiraTrilha.id);
  }, [agendarPersistencia, tracks]);

  const registrarAcao = useCallback((id: string, fn: () => void) => {
    acoesRef.current.set(id, fn);
  }, []);

  const desregistrarAcao = useCallback((id: string) => {
    acoesRef.current.delete(id);
  }, []);

  /**
   * Executa a ação registrada sob `id`, se houver. Devolve `false` quando
   * ninguém registrou ainda — quem chama (`TourOverlay`) decide se tenta de
   * novo; este registro não sabe de tentativas.
   */
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
