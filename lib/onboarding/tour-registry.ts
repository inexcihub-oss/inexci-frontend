import { Permission, hasAnyArea } from "@/lib/permissions";
import {
  TRILHA_ADMINISTRACAO,
  TRILHA_AGENDA,
  TRILHA_ATENDIMENTO,
  TRILHA_CADASTROS,
  TRILHA_DASHBOARD,
  TRILHA_DOCUMENTOS_MEDICO,
  TRILHA_PLANO,
  TRILHA_SOLICITACOES,
} from "./content";
import type { StepKey, TrackId } from "./state";

export interface Gate {
  permission?: Permission;
  anyArea?: boolean;
  requiresDoctor?: boolean;
  requiresOwner?: boolean;
}

export interface TourStep extends Gate {
  key: string;
  titulo: string;
  corpo: string;
  target?: string;
  mobileTarget?: string;
  route?: string;
  required?: boolean;
  aguardaAcao?: boolean;
  keepOpenWhenTargetMissing?: boolean;
  acaoAoAvancar?: string;
  acao?: string;
}

export interface Track extends Gate {
  id: TrackId;
  label: string;
  descricao: string;
  stepKey: StepKey;
  steps: TourStep[];
}

export interface Viewer {
  permissions: Permission[];
  isDoctor: boolean;
  isAccountOwner: boolean;
}

export const ACAO_PROCEDIMENTOS_ABRIR_NOVO_MODELO =
  "procedimentos-abrir-novo-modelo";
export const ACAO_PLANO_ABRIR_SELECAO = "plano-abrir-selecao";
export const ACAO_CADASTROS_ABRIR_MENU_MOBILE =
  "cadastros-abrir-menu-mobile";

export function canSee(gate: Gate, viewer: Viewer): boolean {
  if (gate.requiresOwner && !viewer.isAccountOwner) return false;
  if (gate.requiresDoctor && !viewer.isDoctor) return false;
  if (gate.anyArea && !hasAnyArea(viewer.permissions)) return false;
  if (gate.permission && !viewer.permissions.includes(gate.permission)) {
    return false;
  }
  return true;
}

export const TRACKS: Track[] = [
  {
    id: "documentos-do-medico",
    label: TRILHA_DOCUMENTOS_MEDICO.label,
    descricao: TRILHA_DOCUMENTOS_MEDICO.descricao,
    stepKey: "assinatura-do-medico",
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
        target: "config-header-previa",
        ...TRILHA_DOCUMENTOS_MEDICO.passos.previa,
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
        acao: "agenda-abrir-novo-horario",
        ...TRILHA_AGENDA.passos.horario,
      },
      {
        key: "status",
        target: "agenda-consulta-acoes",
        aguardaAcao: true,
        acao: "agenda-abrir-detalhe-demo",
        ...TRILHA_AGENDA.passos.status,
      },
      {
        key: "filtros",
        target: "agenda-filtros",
        aguardaAcao: true,
        acao: "agenda-abrir-filtros",
        ...TRILHA_AGENDA.passos.filtros,
      },
      {
        key: "exportar",
        target: "agenda-exportar",
        aguardaAcao: true,
        acao: "agenda-abrir-exportacao",
        acaoAoAvancar: "agenda-fechar-modais",
        ...TRILHA_AGENDA.passos.exportar,
      },
      {
        key: "lembrete",
        ...TRILHA_AGENDA.passos.lembrete,
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
        target: "atendimento-abas",
        ...TRILHA_ATENDIMENTO.passos.hub,
      },
      {
        key: "iniciar",
        target: "atendimento-iniciar",
        aguardaAcao: true,
        acao: "atendimento-abrir-detalhe-demo",
        ...TRILHA_ATENDIMENTO.passos.iniciar,
      },
      {
        key: "abas",
        target: "ficha-abas",
        route: "/atendimento/tour-demo",
        ...TRILHA_ATENDIMENTO.passos.abas,
      },
      {
        key: "indicacao",
        target: "ficha-indicacao",
        ...TRILHA_ATENDIMENTO.passos.indicacao,
      },
      {
        key: "documentos",
        target: "ficha-documentos",
        requiresDoctor: true,
        ...TRILHA_ATENDIMENTO.passos.documentos,
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
        key: "kanban-status",
        target: "sc-kanban-colunas",
        ...TRILHA_SOLICITACOES.passos.kanbanStatus,
      },
      {
        key: "filtro",
        target: "sc-filtro",
        ...TRILHA_SOLICITACOES.passos.filtro,
      },
      {
        key: "cadastro-no-modal",
        target: "sc-wizard-novo-cadastro",
        aguardaAcao: true,
        acao: "sc-abrir-cadastro-transversal",
        ...TRILHA_SOLICITACOES.passos.cadastroNoModal,
      },
      {
        key: "requisitos",
        ...TRILHA_SOLICITACOES.passos.requisitos,
      },
      {
        key: "por-documento",
        route: "/solicitacoes-cirurgicas",
        acao: "sc-fechar-wizard",
        target: "sc-por-documento",
        ...TRILHA_SOLICITACOES.passos.porDocumento,
      },
      {
        key: "documento-enviar",
        acao: "sc-abrir-upload-documento",
        target: "sc-documento-analisando",
        aguardaAcao: true,
        acaoAoAvancar: "sc-concluir-analise-documento",
        ...TRILHA_SOLICITACOES.passos.documentoEnviar,
      },
      {
        key: "documento-revisar",
        route: "/solicitacoes-cirurgicas/nova-via-documento",
        target: "sc-documento-paciente-extraido",
        aguardaAcao: true,
        ...TRILHA_SOLICITACOES.passos.documentoRevisar,
      },
    ],
  },
  {
    id: "dashboard",
    label: TRILHA_DASHBOARD.label,
    descricao: TRILHA_DASHBOARD.descricao,
    stepKey: "ver-dashboard",
    permission: Permission.SOLICITACOES,
    steps: [
      {
        key: "kpis",
        route: "/dashboard",
        target: "dashboard-kpis",
        required: true,
        aguardaAcao: true,
        ...TRILHA_DASHBOARD.passos.kpis,
      },
      {
        key: "filtros",
        target: "dashboard-filtros",
        ...TRILHA_DASHBOARD.passos.filtros,
      },
      {
        key: "kanban",
        target: "dashboard-ver-kanban",
        ...TRILHA_DASHBOARD.passos.kanban,
      },
    ],
  },
  {
    id: "cadastros",
    label: TRILHA_CADASTROS.label,
    descricao: TRILHA_CADASTROS.descricao,
    stepKey: "cadastros-basicos",
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
        target: "cadastros-menu",
        mobileTarget: "cadastros-menu-mobile",
        aguardaAcao: true,
        acao: ACAO_CADASTROS_ABRIR_MENU_MOBILE,
        ...TRILHA_CADASTROS.passos.menu,
      },
      {
        key: "clinicas",
        route: "/clinicas",
        target: "cadastros-clinicas",
        permission: Permission.ADMINISTRACAO,
        ...TRILHA_CADASTROS.passos.clinicas,
      },
      {
        key: "procedimentos",
        route: "/procedimentos",
        target: "cadastros-procedimentos",
        permission: Permission.SOLICITACOES,
        ...TRILHA_CADASTROS.passos.procedimentos,
      },
      {
        key: "novo-modelo",
        target: "procedimentos-modelo-nome",
        aguardaAcao: true,
        acao: ACAO_PROCEDIMENTOS_ABRIR_NOVO_MODELO,
        permission: Permission.SOLICITACOES,
        ...TRILHA_CADASTROS.passos.novoModelo,
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
        acao: "administracao-abrir-novo-colaborador",
        ...TRILHA_ADMINISTRACAO.passos.areas,
      },
      {
        key: "vinculo",
        route: "/colaboradores/assistente/tour-demo-colaborador",
        target: "colaborador-vinculo-medico",
        aguardaAcao: true,
        ...TRILHA_ADMINISTRACAO.passos.vinculo,
      },
      {
        key: "ciclo",
        target: "colaborador-ciclo-status",
        ...TRILHA_ADMINISTRACAO.passos.ciclo,
      },
    ],
  },
  {
    id: "plano-e-cota",
    label: TRILHA_PLANO.label,
    descricao: TRILHA_PLANO.descricao,
    stepKey: "plano-e-cota",
    requiresOwner: true,
    steps: [
      {
        key: "assinatura",
        route: "/configuracoes?tab=plan",
        target: "plano-assinatura",
        required: true,
        ...TRILHA_PLANO.passos.assinatura,
      },
      { key: "cota", target: "plano-cota", ...TRILHA_PLANO.passos.cota },
      { key: "acoes", target: "plano-acoes", ...TRILHA_PLANO.passos.acoes },
      {
        key: "planos-disponiveis",
        acao: ACAO_PLANO_ABRIR_SELECAO,
        target: "plano-planos-disponiveis",
        aguardaAcao: true,
        ...TRILHA_PLANO.passos.planosDisponiveis,
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
