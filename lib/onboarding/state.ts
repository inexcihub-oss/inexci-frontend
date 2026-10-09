export const ONBOARDING_STATE_VERSION = 1;

export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "dismissed"
  | "completed";

export type StepKey =
  | "conhecer-plataforma"
  | "criar-solicitacao"
  | "enviar-solicitacao"
  | "criar-por-documento"
  | "assinatura-do-medico"
  | "cabecalho-do-medico"
  | "marcar-consulta"
  | "atender-consulta"
  | "cadastros-basicos"
  | "convidar-colaborador"
  | "plano-e-cota"
  | "ver-dashboard";

export type TrackId =
  | "boas-vindas"
  | "solicitacoes"
  | "documentos-do-medico"
  | "atendimento"
  | "agenda"
  | "cadastros"
  | "administracao"
  | "plano-e-cota"
  | "dashboard";

export interface OnboardingState {
  version: number;
  status: OnboardingStatus;
  welcomeSeenAt: string | null;
  checklistDismissedAt: string | null;
  completedSteps: Partial<Record<StepKey, string>>;
  toursSeen: Partial<Record<TrackId, string>>;
  restartedAt: string | null;
}

export type OnboardingWritablePatch = Partial<
  Pick<
    OnboardingState,
    | "status"
    | "welcomeSeenAt"
    | "checklistDismissedAt"
    | "completedSteps"
    | "toursSeen"
  >
>;

export function mergeOnboardingPatch(
  atual: OnboardingWritablePatch | null,
  novo: OnboardingWritablePatch,
): OnboardingWritablePatch {
  const base = atual ?? {};
  const mesclado: OnboardingWritablePatch = { ...base, ...novo };

  if (base.completedSteps || novo.completedSteps) {
    mesclado.completedSteps = {
      ...(base.completedSteps ?? {}),
      ...(novo.completedSteps ?? {}),
    };
  }
  if (base.toursSeen || novo.toursSeen) {
    mesclado.toursSeen = {
      ...(base.toursSeen ?? {}),
      ...(novo.toursSeen ?? {}),
    };
  }
  return mesclado;
}

export function emptyOnboardingState(): OnboardingState {
  return {
    version: ONBOARDING_STATE_VERSION,
    status: "not_started",
    welcomeSeenAt: null,
    checklistDismissedAt: null,
    completedSteps: {},
    toursSeen: {},
    restartedAt: null,
  };
}

export function normalizeOnboardingState(raw: unknown): OnboardingState {
  const vazio = emptyOnboardingState();
  if (!raw || typeof raw !== "object") return vazio;

  const parcial = raw as Partial<OnboardingState>;
  return {
    version: ONBOARDING_STATE_VERSION,
    status: parcial.status ?? vazio.status,
    welcomeSeenAt: parcial.welcomeSeenAt ?? null,
    checklistDismissedAt: parcial.checklistDismissedAt ?? null,
    completedSteps: { ...(parcial.completedSteps ?? {}) },
    toursSeen: { ...(parcial.toursSeen ?? {}) },
    restartedAt: parcial.restartedAt ?? null,
  };
}

function avancarStatus(state: OnboardingState): OnboardingStatus {
  return state.status === "not_started" ? "in_progress" : state.status;
}

export function markStepComplete(
  state: OnboardingState,
  key: StepKey,
  agora: string,
): OnboardingState {
  return {
    ...state,
    status: avancarStatus(state),
    completedSteps: { ...state.completedSteps, [key]: agora },
  };
}

export function markAllComplete(
  state: OnboardingState,
  keys: StepKey[],
  agora: string,
): OnboardingState {
  const faltando = keys.filter((k) => !state.completedSteps[k]);
  return {
    ...state,
    status: avancarStatus(state),
    welcomeSeenAt: state.welcomeSeenAt ?? agora,
    completedSteps: {
      ...state.completedSteps,
      ...Object.fromEntries(faltando.map((k) => [k, agora])),
    },
  };
}

export function markTourSeen(
  state: OnboardingState,
  trackId: TrackId,
  agora: string,
): OnboardingState {
  return {
    ...state,
    status: avancarStatus(state),
    toursSeen: { ...state.toursSeen, [trackId]: agora },
  };
}

export function markWelcomeSeen(
  state: OnboardingState,
  agora: string,
): OnboardingState {
  return { ...state, welcomeSeenAt: agora, status: avancarStatus(state) };
}

export function dismissChecklist(
  state: OnboardingState,
  agora: string,
): OnboardingState {
  return { ...state, checklistDismissedAt: agora };
}

export function isChecklistVisible(state: OnboardingState): boolean {
  if (state.checklistDismissedAt) return false;
  return state.status !== "completed";
}

export function promoteIfComplete(
  state: OnboardingState,
  stepKeys: StepKey[],
): OnboardingState {
  if (state.status === "completed" || state.status === "dismissed") {
    return state;
  }
  if (stepKeys.length === 0) return state;
  const tudoFeito = stepKeys.every((key) =>
    Boolean(state.completedSteps[key]),
  );
  return tudoFeito ? { ...state, status: "completed" } : state;
}
