import { Permission, hasAnyArea } from "@/lib/permissions";
import {
  TRILHA_ADMINISTRACAO,
  TRILHA_AGENDA,
  TRILHA_ATENDIMENTO,
  TRILHA_CADASTROS,
  TRILHA_DOCUMENTOS_MEDICO,
  TRILHA_PLANO,
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
  /**
   * Id de uma ação registrada via `useOnboardingAction` em algum componente
   * (abrir um modal, trocar um estado interno). O motor tenta executá-la ao
   * ENTRAR neste passo, antes de procurar `target` — substitui a espera
   * passiva de `aguardaAcao` nos passos que hoje dependem do usuário achar o
   * botão sozinho. Os dois campos podem coexistir: `aguardaAcao` continua
   * como rede de segurança (balão de instrução + timeout de 20s) caso a
   * ação ainda não tenha sido registrada.
   */
  acao?: string;
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
 * A ordem do array É a ordem do checklist e a ordem em que o banner global
 * oferece a próxima trilha. Ela segue o dia real de quem usa a plataforma, não
 * a arquitetura do código:
 *
 * 1. `documentos-do-medico` — preparo. Sem assinatura, tudo que for emitido
 *    depois sai sem assinar; é a única trilha que estraga o resultado das
 *    outras se ficar para depois.
 * 2. `agenda` — a consulta precisa existir antes de haver o que atender.
 * 3. `atendimento` — a consulta vira ficha.
 * 4. `solicitacoes` — a ficha com indicação cirúrgica vira solicitação.
 * 5. `cadastros` — transversal; vem depois porque o wizard já ensinou a criar
 *    cada cadastro de dentro dele, sem precisar da tela.
 * 6. `administracao` e 7. `plano-e-cota` — tarefas do dono da conta, feitas
 *    uma vez, não no primeiro dia.
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
        key: "lembrete",
        // Sem alvo de propósito: o lembrete é um `@Cron` do backend, não tem
        // controle na tela. Card centralizado é a forma honesta de dizer isso.
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
        // O texto do passo fala da LISTA de consultas ("Próximas e
        // realizadas, na mesma tela"), não de um botão de criação — a âncora
        // certa é o grupo de abas, não "atendimento-nova-consulta" (bug real
        // achado pelo usuário: o destaque caía no botão errado).
        target: "atendimento-abas",
        ...TRILHA_ATENDIMENTO.passos.hub,
      },
      {
        key: "iniciar",
        // Abre com uma consulta FABRICADA (nunca existe de verdade) — ver
        // `lib/onboarding/demo-data.ts` e a ação registrada em
        // `app/(dashboard)/atendimento/page.tsx`. `aguardaAcao` continua como
        // rede de segurança.
        target: "atendimento-iniciar",
        aguardaAcao: true,
        acao: "atendimento-abrir-detalhe-demo",
        ...TRILHA_ATENDIMENTO.passos.iniciar,
      },
      {
        key: "abas",
        // Navega DE VERDADE para a página de atendimento, usando o id
        // sentinela — `/atendimento/[appointmentId]/page.tsx` (Task 8)
        // reconhece "tour-demo" e usa dados fabricados em vez de buscar no
        // backend. Substitui o `aguardaAcao` que dependia do usuário clicar
        // em "Iniciar atendimento" de verdade.
        target: "ficha-abas",
        route: "/atendimento/tour-demo",
        ...TRILHA_ATENDIMENTO.passos.abas,
      },
      {
        key: "indicacao",
        // Mesma página do passo anterior — já carregada, sem precisar de
        // rota nem `aguardaAcao` de novo.
        target: "ficha-indicacao",
        ...TRILHA_ATENDIMENTO.passos.indicacao,
      },
      {
        key: "documentos",
        // Mesma página dos dois passos anteriores.
        target: "ficha-documentos",
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
        // `sc-wizard-novo-cadastro` vive dentro do painel de seleção de
        // procedimento do wizard — a ação abre o wizard E pede a ele para já
        // mostrar esse painel (ver `solicitacoes-cirurgicas/page.tsx`,
        // Task 9, e `CreateSurgeryRequestWizard.tsx`, Task 5).
        target: "sc-wizard-novo-cadastro",
        aguardaAcao: true,
        acao: "sc-abrir-cadastro-transversal",
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
        // `route` sozinho não bastava: é a MESMA rota do passo anterior, e
        // o Next.js trata isso como no-op — o wizard aberto por
        // "cadastro-no-modal" continuava por cima do alvo (bug real). A
        // `acao` fecha o wizard explicitamente ao entrar neste passo.
        acao: "sc-fechar-wizard",
        target: "sc-por-documento",
        ...TRILHA_SOLICITACOES.passos.porDocumento,
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
      {
        key: "novo-modelo",
        target: "procedimentos-modelo-nome",
        aguardaAcao: true,
        acao: "procedimentos-abrir-novo-modelo",
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
  {
    id: "plano-e-cota",
    label: TRILHA_PLANO.label,
    descricao: TRILHA_PLANO.descricao,
    stepKey: "plano-e-cota",
    // `requiresOwner` é `isAccountOwner`, NUNCA `isAdmin`: o admin delegado tem
    // `role: 'admin'` e `?tab=plan` o devolve para `profile`
    // (`resolveSettingsTab`). Um tour que navega para uma tela que devolve o
    // usuário é pior do que tour nenhum.
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
        acao: "plano-abrir-selecao",
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
