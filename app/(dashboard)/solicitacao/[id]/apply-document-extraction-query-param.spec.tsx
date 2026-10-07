import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SolicitacaoDetalhePage from "./page";

/**
 * Cobre a reabertura do `ApplyDocumentExtractionModal` a partir do link da
 * notificação de conclusão da análise em background
 * (`?applyDocExtractionJobId=`) — mesmo padrão do `docExtractionJobId` usado
 * pela criação de SC via documento em `/solicitacoes-cirurgicas`.
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

describe("Detalhe da Solicitação — reabertura via applyDocExtractionJobId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
  });

  it("abre o modal direto na revisão quando o job já concluiu", async () => {
    searchParamsState.value = new URLSearchParams({
      applyDocExtractionJobId: "job-1",
    });
    getExtractFromDocumentStatusMock.mockResolvedValueOnce({
      status: "done",
      result: {
        kind: "medical_report",
        confidence: 0.9,
        extracted: {},
        suggestedDocumentType: "medical_report",
        patientCpfMissing: false,
        patientMatchedByCpf: false,
        candidates: { patient: [], hospital: [], healthPlan: [], procedure: [] },
        tempStoragePath: "tmp/doc.pdf",
      },
    });

    renderPagina();

    expect(
      await screen.findByText("Revise os dados antes de adicionar"),
    ).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/solicitacao/sc-1", {
      scroll: false,
    });
  });

  it("avisa que a análise ainda está em andamento", async () => {
    searchParamsState.value = new URLSearchParams({
      applyDocExtractionJobId: "job-2",
    });
    getExtractFromDocumentStatusMock.mockResolvedValueOnce({
      status: "processing",
    });

    renderPagina();

    expect(
      await screen.findByText(
        "A análise do documento ainda está em andamento. Você receberá uma notificação quando concluir.",
      ),
    ).toBeInTheDocument();
  });

  it("mostra a mensagem de erro do job quando a análise falhou", async () => {
    searchParamsState.value = new URLSearchParams({
      applyDocExtractionJobId: "job-3",
    });
    getExtractFromDocumentStatusMock.mockResolvedValueOnce({
      status: "error",
      message: "Falha no OCR",
    });

    renderPagina();

    expect(await screen.findByText("Falha no OCR")).toBeInTheDocument();
  });
});
