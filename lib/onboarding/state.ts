/**
 * Espelho de `inexci-api/src/modules/onboarding/onboarding.types.ts` e
 * `onboarding.constants.ts`. Os valores viajam pela API — não mude um lado
 * sem o outro, exatamente como acontece com `lib/permissions.ts`.
 */

export const ONBOARDING_STATE_VERSION = 1;

/**
 * `dismissed` nunca é atribuído pelo frontend: `checklistDismissedAt` é a
 * fonte de verdade de que o usuário dispensou o card (ver `dismissChecklist`
 * / `isChecklistVisible`), e `status` não duplica essa informação. O literal
 * fica reservado no union porque a whitelist `ONBOARDING_STATUSES` do backend
 * espelha exatamente estes quatro valores — removê-lo aqui exigiria uma
 * mudança cross-repo por um ganho puramente cosmético.
 */
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

/**
 * Patch que o CLIENTE tem permissão de mandar num PATCH. `restartedAt` fica
 * de fora DE PROPÓSITO: é escrito só pelo `POST /onboarding/reset`, no
 * servidor. Mandar o snapshot inteiro do estado local (que incluiria
 * `restartedAt`) foi exatamente o bug que a revisão final do backend achou —
 * o DTO lá roda `forbidNonWhitelisted` e devolvia 400 em toda escrita,
 * silenciado pelo `.catch` que só loga. `OnboardingProvider` e
 * `onboardingService.patch` usam só este tipo — não existe mais um tipo de
 * patch mais largo ao lado dele para alguém alcançar por engano; foi
 * exatamente essa vizinhança que deixou o bug original passar despercebido
 * por dezesseis revisões.
 */
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

/**
 * Funde dois patches PARCIAIS — nunca o estado inteiro. `completedSteps` e
 * `toursSeen` são mesclados chave a chave (espelha o merge do backend);
 * escalares (`status`, `welcomeSeenAt`, `checklistDismissedAt`) são
 * last-write-wins, o que é seguro aqui porque as duas pontas do merge vêm da
 * MESMA sessão/aba entre dois debounces — não é o merge entre dispositivos
 * diferentes, que é responsabilidade do servidor.
 *
 * Só inclui `completedSteps`/`toursSeen` no resultado se pelo menos um dos
 * dois lados os tinha — sem isso, todo PATCH ganharia `{ completedSteps: {},
 * toursSeen: {} }` mesmo quando nenhuma ação tocou nesses campos, o que
 * reabriria uma versão mais sutil do próprio bug que este tipo existe para
 * evitar (mandar campo que a ação não tocou).
 */
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

/**
 * O checklist é uma ajuda para o percurso, não uma tela de término. Assim
 * que todas as trilhas acabam, ele some imediatamente e a celebração
 * passageira assume essa comunicação. Mantê-lo visível durante a própria
 * sessão de conclusão foi o que deixava o banner preso no topo da tela.
 */
export function isChecklistVisible(state: OnboardingState): boolean {
  if (state.checklistDismissedAt) return false;
  return state.status !== "completed";
}

/**
 * Promove `status` para `completed` quando toda trilha visível (`stepKeys`)
 * já tem uma entrada em `completedSteps`. Chamada pelo provider a cada
 * mudança de estado — ele é quem sabe quais trilhas são visíveis para o
 * usuário atual (permissões, `isDoctor`, `isAccountOwner`); aqui fica só a
 * regra pura.
 *
 * Sem nenhuma trilha visível não promove nada: "tudo pronto" não faz sentido
 * para quem não tinha nada a fazer (e o card nem chega a renderizar nesse
 * caso — `tracks.length === 0`). Dispensar (`checklistDismissedAt`) NÃO
 * impede a promoção: são eixos independentes, e completar o resto depois
 * pela aba de Configurações é um fato que continua valendo mesmo com o card
 * escondido. `status === "dismissed"` nunca ocorre na prática (ver comentário
 * no tipo `OnboardingStatus`) — o curto-circuito abaixo é só para não
 * regredir esse literal reservado, caso um dia passe a ser escrito.
 */
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
