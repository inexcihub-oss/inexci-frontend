import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SolicitacaoDetalhePage from "./page";

/**
 * Rolagem automática da aba Atividades.
 *
 * Ao chegar uma atividade nova a lista precisa ir para o fim — mas SÓ a
 * lista. `scrollIntoView` rola todo ancestral rolável, e no desktop o
 * `<main>` do dashboard é `lg:overflow-hidden`: continua sendo um container
 * rolável por código, só que sem barra de rolagem para o usuário desfazer.
 * Quando o banner do onboarding ocupa altura, o conteúdo do `main` passa a
 * transbordar, e mandar o fim da lista "para a vista" arrastava a página
 * inteira para cima — banner cortado no topo, faixa vazia no rodapé e nenhum
 * jeito de voltar sem recarregar.
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

const { atividadesFixture } = vi.hoisted(() => ({
  atividadesFixture: [
    {
      id: "act-1",
      type: "comment" as const,
      content: "@Alessandro Filho verifique para mim",
      createdAt: "2026-01-01T10:00:00.000Z",
      user: { id: "user-2", name: "Dr. Carlos", avatarUrl: null },
      mentions: [{ id: "user-3", name: "Alessandro Filho" }],
    },
  ],
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
      getActivities: vi.fn().mockResolvedValue(atividadesFixture),
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


describe("Detalhe da Solicitação — rolagem da aba Atividades", () => {
  const scrollIntoViewOriginal = Element.prototype.scrollIntoView;
  const scrollToOriginal = Element.prototype.scrollTo;

  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
  let alvosDeScrollTo: Element[];

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams({ sidebar: "atividades" });
    localStorage.clear();
    window.history.replaceState({}, "", "/solicitacao/sc-1?sidebar=atividades");

    // jsdom não implementa nenhum dos dois; stubamos para poder observar.
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    alvosDeScrollTo = [];
    Element.prototype.scrollTo = function (this: Element) {
      alvosDeScrollTo.push(this);
    } as unknown as Element["scrollTo"];
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = scrollIntoViewOriginal;
    Element.prototype.scrollTo = scrollToOriginal;
    window.history.replaceState({}, "", "/");
  });

  it("não usa scrollIntoView ao receber atividades — isso arrastaria a página inteira", async () => {
    renderPagina();

    await screen.findByText("@Alessandro Filho", { exact: false });

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("rola o próprio container da lista até o fim", async () => {
    renderPagina();

    await screen.findByText("@Alessandro Filho", { exact: false });

    const lista = await screen.findByTestId("lista-atividades");
    expect(alvosDeScrollTo).toContain(lista);
  });
});
