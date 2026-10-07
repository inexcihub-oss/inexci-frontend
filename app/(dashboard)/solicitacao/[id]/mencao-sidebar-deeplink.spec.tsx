import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SolicitacaoDetalhePage from "./page";

/**
 * Deep-link da notificação de menção: `/solicitacao/:id?sidebar=atividades`.
 *
 * O caso que importa é o mobile. A página tem DOIS efeitos de montagem que
 * mexem no painel lateral: o que lê o `?sidebar=` (abre) e o padrão de
 * mobile (fecha, quando `innerWidth < 1024`). Eles rodam na ordem de
 * declaração, e o de fechar vem depois — sem uma guarda explícita o
 * segundo desfaz o primeiro e a notificação abre a SC com a aba de
 * atividades fechada, que é justamente o que o link deveria evitar.
 */

const { replaceMock, searchParamsState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchParamsState: { value: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sc-1" }),
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: () => searchParamsState.value,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: false,
    user: { id: "user-1" },
    can: () => true,
    permissions: [],
    canCreateSurgeryRequest: true,
    blockReason: null,
    blockReasonCode: null,
    refreshSubscription: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAvailableDoctors", () => ({
  useAvailableDoctors: () => ({ data: [] }),
}));

vi.mock("@/components/surgery-request/tabs/InformacoesGeraisTab", () => ({
  InformacoesGeraisTab: () => <div>Stub Informações Gerais</div>,
}));
vi.mock("@/components/surgery-request/tabs/CodigoTussTab", () => ({
  CodigoTussTab: () => <div>Stub TUSS</div>,
}));
vi.mock("@/components/surgery-request/tabs/OpmeTab", () => ({
  OpmeTab: () => <div>Stub OPME</div>,
}));
vi.mock("@/components/laudo/MedicalReportEditor", () => ({
  MedicalReportEditor: () => <div>Stub Laudo</div>,
}));
vi.mock("@/components/surgery-request/tabs/PosCirurgicoTab", () => ({
  PosCirurgicoTab: () => <div>Stub Pós-Cirúrgico</div>,
}));
vi.mock("@/components/surgery-request/tabs/FaturamentoTab", () => ({
  FaturamentoTab: () => <div>Stub Faturamento</div>,
}));

const { solicitacaoFixture } = vi.hoisted(() => ({
  solicitacaoFixture: {
    id: 1,
    status: 1,
    protocol: "SC-0001",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    observations: null,
    procedureName: "Artroscopia de joelho",
    patient: { id: "pat-1", name: "Paciente Teste" },
    doctor: { id: "doc-1", name: "Dr. Teste", doctorProfile: {} },
    hospital: { id: "hosp-1", name: "Hospital Teste" },
    healthPlan: { id: "hp-1", name: "Convênio Teste" },
    procedure: { id: "proc-1", name: "Artroscopia de joelho" },
    tussProcedure: null,
    tussItems: [],
    opmeItems: [],
    documents: [],
    sections: [],
    activities: [],
    contestations: [],
    pendencies: [],
    analysis: null,
    billing: null,
    receipt: null,
    scheduling: null,
    pendenciesSummary: null,
    cid: null,
    healthPlanName: "Convênio Teste",
    healthPlanRegistration: null,
    healthPlanType: null,
    hospitalId: "hosp-1",
    healthPlanId: "hp-1",
    hasOpme: false,
    surgeryDate: null,
    surgeryPerformedAt: null,
    closedAt: null,
    closedReason: null,
  },
}));

const { getExtractFromDocumentStatusMock } = vi.hoisted(() => ({
  getExtractFromDocumentStatusMock: vi.fn(),
}));

vi.mock("@/services/surgery-request.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/surgery-request.service")
  >();
  return {
    ...original,
    surgeryRequestService: {
      ...original.surgeryRequestService,
      getById: vi.fn().mockResolvedValue(solicitacaoFixture),
      getActivities: vi.fn().mockResolvedValue([]),
      getExtractFromDocumentStatus: getExtractFromDocumentStatusMock,
      getMentionableUsers: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock("@/services/pendency.service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/pendency.service")>();
  return {
    ...original,
    pendencyService: {
      ...original.pendencyService,
      validate: vi.fn().mockResolvedValue({
        currentStatus: 1,
        statusLabel: "Pendente",
        pendencies: [],
        canAdvance: false,
        nextStatus: null,
        completedCount: 0,
        pendingCount: 0,
        totalCount: 0,
      }),
    },
  };
});

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SolicitacaoDetalhePage />
    </QueryClientProvider>,
  );
}

function definirLargura(largura: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: largura,
  });
}

describe("Detalhe da Solicitação — deep-link ?sidebar=atividades da menção", () => {
  const larguraOriginal = window.innerWidth;

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
    localStorage.clear();
    definirLargura(larguraOriginal);
    window.history.replaceState({}, "", "/solicitacao/sc-1");
  });

  afterEach(() => {
    definirLargura(larguraOriginal);
    window.history.replaceState({}, "", "/");
  });

  it("no mobile (375px) abre o painel na aba Atividades", async () => {
    definirLargura(375);
    window.history.replaceState({}, "", "/solicitacao/sc-1?sidebar=atividades");
    searchParamsState.value = new URLSearchParams({ sidebar: "atividades" });

    renderPagina();

    expect(
      await screen.findByPlaceholderText("Escreva um comentário"),
    ).toBeInTheDocument();
  });

  it("a folha do painel tem altura fixa, não derivada do conteúdo", async () => {
    definirLargura(375);
    window.history.replaceState({}, "", "/solicitacao/sc-1?sidebar=atividades");
    searchParamsState.value = new URLSearchParams({ sidebar: "atividades" });

    renderPagina();

    const painel = await screen.findByTestId("painel-lateral-sc");

    // Asserção de classe por falta de alternativa: jsdom não calcula layout.
    // Com `max-h` a folha encolhia junto com o conteúdo e cada comentário
    // enviado mudava a altura do painel; a altura fixa é o que mantém a
    // moldura estável entre as abas Pendências/Atividades/Timeline.
    expect(painel).toHaveClass("h-[calc(92dvh-64px)]");
    expect(painel.className).not.toMatch(/(?<!lg:)max-h-\[/);
  });

  it("no mobile sem ?sidebar= o painel continua fechado por padrão", async () => {
    definirLargura(375);

    renderPagina();

    await screen.findByText("Stub Informações Gerais");
    expect(
      screen.queryByPlaceholderText("Escreva um comentário"),
    ).not.toBeInTheDocument();
  });
});
