import { Permission, hasAnyArea } from "@/lib/permissions";
import {
  TRILHA_ADMINISTRACAO,
  TRILHA_AGENDA,
  TRILHA_ATENDIMENTO,
  TRILHA_CADASTROS,
  TRILHA_DOCUMENTOS_MEDICO,
  TRILHA_SOLICITACOES,
} from "./content";
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
  /**
   * O alvo só existe depois de uma ação do usuário — tipicamente abrir o modal
   * que o passo anterior mandou abrir. Faz o motor esperar 20 s em vez de 800
   * ms e, enquanto espera, mostrar o balão centralizado com a instrução, em
   * vez do fundo escurecido mudo. Sem isso, todo passo ancorado dentro de um
   * modal seria pulado em silêncio antes de o usuário ter tempo de clicar.
   */
  aguardaAcao?: boolean;
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
    label: TRILHA_DOCUMENTOS_MEDICO.label,
    descricao: TRILHA_DOCUMENTOS_MEDICO.descricao,
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
        ...TRILHA_DOCUMENTOS_MEDICO.passos.assinatura,
      },
      {
        key: "cabecalho-logo",
        route: "/configuracoes?tab=header",
        target: "config-header-logo",
        ...TRILHA_DOCUMENTOS_MEDICO.passos.cabecalhoLogo,
      },
      {
        key: "cabecalho-texto",
        target: "config-header-texto",
        ...TRILHA_DOCUMENTOS_MEDICO.passos.cabecalhoTexto,
      },
      {
        key: "previa",
        // Sem `required`: o card de prévia só existe quando já há logo ou
        // texto salvo. Para o médico que abre o cabeçalho pela primeira vez
        // ele não está lá, e pular em silêncio é melhor do que interromper.
        target: "config-header-previa",
        ...TRILHA_DOCUMENTOS_MEDICO.passos.previa,
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
  {
    id: "atendimento",
    label: TRILHA_ATENDIMENTO.label,
    descricao: TRILHA_ATENDIMENTO.descricao,
    stepKey: "atender-consulta",
    permission: Permission.ATENDIMENTO,
    steps: [
      {
        key: "hub",
        route: "/atendimento",
        target: "atendimento-nova-consulta",
        ...TRILHA_ATENDIMENTO.passos.hub,
      },
      {
        key: "iniciar",
        // Vive dentro do modal de detalhe da consulta, que o usuário abre
        // clicando numa consulta da lista. `aguardaAcao` dá tempo para isso.
        target: "atendimento-iniciar",
        aguardaAcao: true,
        ...TRILHA_ATENDIMENTO.passos.iniciar,
      },
      {
        key: "abas",
        target: "ficha-abas",
        aguardaAcao: true,
        ...TRILHA_ATENDIMENTO.passos.abas,
      },
      {
        key: "indicacao",
        target: "ficha-indicacao",
        aguardaAcao: true,
        ...TRILHA_ATENDIMENTO.passos.indicacao,
      },
      {
        key: "documentos",
        target: "ficha-documentos",
        aguardaAcao: true,
        // Emitir receita, atestado e pedido de exame é ato privativo do
        // médico (`AccessControlService.assertIsDoctor` no backend). Quem tem
        // Atendimento mas não tem `doctor_profile` lê o prontuário e não vê
        // estes botões — mostrar o passo seria ensinar o que ele não pode.
        requiresDoctor: true,
        ...TRILHA_ATENDIMENTO.passos.documentos,
      },
    ],
  },
  {
    id: "agenda",
    label: TRILHA_AGENDA.label,
    descricao: TRILHA_AGENDA.descricao,
    stepKey: "marcar-consulta",
    permission: Permission.AGENDA,
    steps: [
      {
        key: "nova-consulta",
        route: "/agenda",
        target: "agenda-nova-consulta",
        required: true,
        ...TRILHA_AGENDA.passos.novaConsulta,
      },
      {
        key: "horario",
        target: "agenda-modal-horario",
        aguardaAcao: true,
        ...TRILHA_AGENDA.passos.horario,
      },
      {
        key: "status",
        target: "agenda-consulta-acoes",
        aguardaAcao: true,
        ...TRILHA_AGENDA.passos.status,
      },
      {
        key: "lembrete",
        // Sem alvo de propósito: o lembrete é um `@Cron` do backend, não tem
        // controle na tela. Card centralizado é a forma honesta de dizer isso.
        ...TRILHA_AGENDA.passos.lembrete,
      },
    ],
  },
  {
    id: "cadastros",
    label: TRILHA_CADASTROS.label,
    descricao: TRILHA_CADASTROS.descricao,
    stepKey: "cadastros-basicos",
    // `anyArea` espelha `@RequireAnyArea()` do backend: cadastro é transversal
    // às quatro áreas, e o isolamento real é por `ownerId`, não por área.
    anyArea: true,
    steps: [
      {
        key: "pacientes",
        route: "/pacientes",
        target: "cadastros-pacientes",
        required: true,
        ...TRILHA_CADASTROS.passos.pacientes,
      },
      {
        key: "menu",
        // A sidebar é drawer no mobile: o alvo não existe em 375 px e o passo
        // degrada para card centralizado, mantendo a informação.
        target: "cadastros-menu",
        ...TRILHA_CADASTROS.passos.menu,
      },
      {
        key: "clinicas",
        route: "/clinicas",
        target: "cadastros-clinicas",
        // A TELA de clínicas é de administração (`ROUTE_PERMISSIONS`), embora
        // a leitura da lista fique aberta no backend para o modal de consulta.
        // Sem este gate o tour mandaria um assistente de agenda para uma rota
        // que o `PermissionRouteGuard` devolve.
        permission: Permission.ADMINISTRACAO,
        ...TRILHA_CADASTROS.passos.clinicas,
      },
      {
        key: "procedimentos",
        route: "/procedimentos",
        target: "cadastros-procedimentos",
        // "Procedimentos" edita `SurgeryRequestTemplate` e herda a permissão de
        // classe do `SurgeryRequestsController`: Solicitações, não Administração.
        permission: Permission.SOLICITACOES,
        ...TRILHA_CADASTROS.passos.procedimentos,
      },
    ],
  },
  {
    id: "administracao",
    label: TRILHA_ADMINISTRACAO.label,
    descricao: TRILHA_ADMINISTRACAO.descricao,
    stepKey: "convidar-colaborador",
    permission: Permission.ADMINISTRACAO,
    steps: [
      {
        key: "convidar",
        route: "/colaboradores",
        target: "admin-novo-colaborador",
        required: true,
        ...TRILHA_ADMINISTRACAO.passos.convidar,
      },
      {
        key: "areas",
        target: "admin-areas",
        aguardaAcao: true,
        ...TRILHA_ADMINISTRACAO.passos.areas,
      },
      {
        key: "vinculo",
        // Sem alvo: o vínculo mora na ficha de um colaborador que ainda não
        // existe para quem está fazendo o onboarding.
        ...TRILHA_ADMINISTRACAO.passos.vinculo,
      },
      {
        key: "ciclo",
        // Idem: as ações de linha só existem com a lista preenchida.
        ...TRILHA_ADMINISTRACAO.passos.ciclo,
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
