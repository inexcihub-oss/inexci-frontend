/**
 * Espelho de `inexci-api/src/modules/onboarding/onboarding.types.ts` e
 * `onboarding.constants.ts`. Os valores viajam pela API — não mude um lado
 * sem o outro, exatamente como acontece com `lib/permissions.ts`.
 */

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
  | "plano-e-cota";

export type TrackId =
  | "boas-vindas"
  | "solicitacoes"
  | "documentos-do-medico"
  | "atendimento"
  | "agenda"
  | "cadastros"
  | "administracao"
  | "plano-e-cota";

export interface OnboardingState {
  version: number;
  status: OnboardingStatus;
  welcomeSeenAt: string | null;
  checklistDismissedAt: string | null;
  completedSteps: Partial<Record<StepKey, string>>;
  toursSeen: Partial<Record<TrackId, string>>;
  restartedAt: string | null;
}

export type OnboardingPatch = Partial<Omit<OnboardingState, "version">>;

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

/**
 * Sai de `not_started` na primeira interação real. Não toca em `dismissed`
 * nem em `completed`: dispensar é escolha do usuário, e concluir um passo
 * avulso pela aba de Configurações não deve ressuscitar o card na home.
 */
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
  return !state.checklistDismissedAt && state.status !== "completed";
}
