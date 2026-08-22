import { Permission, hasAnyArea } from "@/lib/permissions";
import { TRILHA_ASSINATURA, TRILHA_SOLICITACOES } from "./content";
import type { StepKey, TrackId } from "./state";

/** Condição de visibilidade. Todas as declaradas precisam passar (AND). */
export interface Gate {
  permission?: Permission;
  /** Basta ter QUALQUER uma das quatro áreas — espelha `@RequireAnyArea()`. */
  anyArea?: boolean;
  /** Exige `doctor_profile`, não a área de Atendimento. */
  requiresDoctor?: boolean;
  /** Exige ser o DONO da conta (`isAccountOwner`), nunca `isAdmin`. */
  requiresOwner?: boolean;
}

export interface TourStep extends Gate {
  key: string;
  titulo: string;
  corpo: string;
  /** Valor do `data-tour` do elemento a destacar. Ausente = card centralizado. */
  target?: string;
  /** Rota a abrir antes do passo. */
  route?: string;
  /**
   * `true` = sem este alvo o tour não faz sentido e encerra com aviso.
   * `false` (padrão) = alvo ausente pula o passo em silêncio.
   */
  required?: boolean;
}

export interface Track extends Gate {
  id: TrackId;
  label: string;
  descricao: string;
  /** Item do checklist que esta trilha conclui. */
  stepKey: StepKey;
  steps: TourStep[];
}

export interface Viewer {
  permissions: Permission[];
  isDoctor: boolean;
  isAccountOwner: boolean;
}

export function canSee(gate: Gate, viewer: Viewer): boolean {
  if (gate.requiresOwner && !viewer.isAccountOwner) return false;
  if (gate.requiresDoctor && !viewer.isDoctor) return false;
  if (gate.anyArea && !hasAnyArea(viewer.permissions)) return false;
  if (gate.permission && !viewer.permissions.includes(gate.permission)) {
    return false;
  }
  return true;
}

/**
 * Fase 1 traz a trilha de solicitações e o passo avulso da assinatura. As
 * demais entram nas fases seguintes — declarar entradas com `steps: []` agora
 * colocaria itens vazios no checklist de produção.
 *
 * A assinatura vem PRIMEIRO no array de propósito: é pré-requisito do laudo,
 * e o checklist é lido de cima para baixo.
 */
export const TRACKS: Track[] = [
  {
    id: "documentos-do-medico",
    label: TRILHA_ASSINATURA.label,
    descricao: TRILHA_ASSINATURA.descricao,
    stepKey: "assinatura-do-medico",
    // `requiresDoctor` é a existência de `doctor_profile`, não a área de
    // Atendimento: assinar é ato privativo do médico.
    requiresDoctor: true,
    steps: [
      {
        key: "assinatura",
        route: "/configuracoes?tab=profile",
        target: "config-assinatura",
        required: true,
        ...TRILHA_ASSINATURA.passo,
      },
    ],
  },
  {
    id: "solicitacoes",
    label: TRILHA_SOLICITACOES.label,
    descricao: TRILHA_SOLICITACOES.descricao,
    stepKey: "criar-solicitacao",
    permission: Permission.SOLICITACOES,
    steps: [
      {
        key: "abrir-wizard",
        route: "/solicitacoes-cirurgicas",
        target: "sc-nova",
        required: true,
        ...TRILHA_SOLICITACOES.passos.abrirWizard,
      },
      {
        key: "cadastro-no-modal",
        // Sem `target` de propósito: `sc-wizard-novo-cadastro` só existe
        // DENTRO do modal do wizard, que o passo 1 não abre sozinho. Ancorar
        // aqui exigiria um tour interativo (usuário clica, wizard abre, tour
        // avança) — mudança de Fase 4, não deste fix-wave. Até lá, degrada
        // para card centralizado (spec §3.4). O atributo `data-tour` continua
        // em `SelectionContents.tsx` para quando a Fase 4 chegar — não
        // remova.
        ...TRILHA_SOLICITACOES.passos.cadastroNoModal,
      },
      {
        key: "requisitos",
        // Sem `target` de propósito: `sc-requisitos` só existe na tela de
        // detalhe de uma solicitação já criada, e um usuário em seu primeiro
        // tour não tem nenhuma solicitação para abrir. Não há alvo real
        // possível aqui — vira card centralizado (spec §3.4), mas mantém a
        // lista de requisitos vinda do backend. O atributo `data-tour`
        // continua em `solicitacao/[id]/page.tsx` para uma futura versão
        // interativa — não remova.
        ...TRILHA_SOLICITACOES.passos.requisitos,
      },
      {
        key: "por-documento",
        route: "/solicitacoes-cirurgicas",
        target: "sc-por-documento",
        ...TRILHA_SOLICITACOES.passos.porDocumento,
      },
    ],
  },
];

export function visibleTracks(viewer: Viewer): Track[] {
  return TRACKS.filter((track) => canSee(track, viewer));
}

export function visibleSteps(track: Track, viewer: Viewer): TourStep[] {
  return track.steps.filter((step) => canSee(step, viewer));
}

export function trackById(id: TrackId): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}
