import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestProviders } from "@/test-utils/render-with-providers";
import { QueryClient } from "@tanstack/react-query";
import SolicitacaoDetalhePage from "./page";

const { replaceMock, searchParamsState, fixtureState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchParamsState: { value: new URLSearchParams() },
  fixtureState: { value: {} as Record<string, unknown> },
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

const base = {
  id: 1,
  status: 1,
  protocol: "SC-0001",
  priority: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  observations: null,
  patient: { id: "pat-1", name: "Paciente Teste" },
  doctor: { id: "doc-1", name: "Dr. Teste", doctorProfile: {} },
  hospital: null,
  healthPlan: null,
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
  healthPlanName: null,
  healthPlanRegistration: null,
  healthPlanType: null,
  hospitalId: null,
  healthPlanId: null,
  hasOpme: false,
  surgeryDate: null,
  surgeryPerformedAt: null,
  closedAt: null,
  closedReason: null,
};

const { confirmDateMock, exportPdfMock } = vi.hoisted(() => ({
  confirmDateMock: vi.fn(),
  exportPdfMock: vi.fn(),
}));

vi.mock("@/services/surgery-request.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/surgery-request.service")
  >();
  return {
    ...original,
    surgeryRequestService: {
      ...original.surgeryRequestService,
      getById: vi.fn(async () => fixtureState.value),
      getActivities: vi.fn().mockResolvedValue([]),
      confirmDate: confirmDateMock,
      exportPdf: exportPdfMock,
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
        canAdvance: true,
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
    <TestProviders queryClient={queryClient}>
      <SolicitacaoDetalhePage />
    </TestProviders>,
  );
}

describe("Detalhe da Solicitação — ?action=confirm-date (B6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
  });

  it("confirma a data já escolhida quando chega pelo menu do card", async () => {
    confirmDateMock.mockResolvedValue(undefined);
    fixtureState.value = {
      ...base,
      status: 4,
      documents: [{ id: "d1", key: "consent_term" }],
      scheduling: {
        dateOptions: ["2026-12-01T08:00:00.000Z", "2026-12-02T08:00:00.000Z"],
        selectedDateIndex: 1,
      },
    };
    searchParamsState.value = new URLSearchParams({ action: "confirm-date" });

    renderPagina();

    await waitFor(() =>
      expect(confirmDateMock).toHaveBeenCalledWith(1, { selectedDateIndex: 1 }),
    );
  });

  it("abre a definição de data quando não há datas sugeridas", async () => {
    fixtureState.value = {
      ...base,
      status: 4,
      documents: [{ id: "d1", key: "consent_term" }],
    };
    searchParamsState.value = new URLSearchParams({ action: "confirm-date" });

    renderPagina();

    expect(
      await screen.findByText("Definir Data da Cirurgia"),
    ).toBeInTheDocument();
  });

  it("avisa sobre o termo de consentimento ausente", async () => {
    fixtureState.value = { ...base, status: 4 };
    searchParamsState.value = new URLSearchParams({ action: "confirm-date" });

    renderPagina();

    expect(
      await screen.findByRole("button", { name: "Confirmar mesmo assim" }),
    ).toBeInTheDocument();
  });

  it("pede para escolher a data quando há opções e nenhuma selecionada", async () => {
    fixtureState.value = {
      ...base,
      status: 4,
      documents: [{ id: "d1", key: "consent_term" }],
      scheduling: { dateOptions: ["2026-12-01T08:00:00.000Z"] },
    };
    searchParamsState.value = new URLSearchParams({ action: "confirm-date" });

    renderPagina();

    expect(
      await screen.findByText(
        "Selecione uma das datas sugeridas para confirmar o agendamento.",
      ),
    ).toBeInTheDocument();
    expect(confirmDateMock).not.toHaveBeenCalled();
  });
});

describe("Detalhe da Solicitação — abas por etapa (B7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
  });

  it("SC encerrada ainda Pendente não mostra Pós Cirúrgico nem Faturamento", async () => {
    fixtureState.value = { ...base, status: 9, closedReason: "Duplicada" };
    renderPagina();

    expect(
      await screen.findByRole("button", { name: "Laudo" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pós Cirúrgico" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Faturamento" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Exportar PDF/ }),
    ).not.toBeInTheDocument();
  });

  it("SC encerrada depois de faturada mantém as duas abas", async () => {
    fixtureState.value = {
      ...base,
      status: 9,
      surgeryPerformedAt: "2026-02-01T00:00:00.000Z",
      billing: { invoiceValue: 1000, invoiceSentAt: "2026-02-10" },
    };
    renderPagina();

    expect(
      await screen.findByRole("button", { name: "Pós Cirúrgico" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Faturamento" }),
    ).toBeInTheDocument();
  });

  it("SC realizada mostra Pós Cirúrgico mas não Faturamento", async () => {
    fixtureState.value = {
      ...base,
      status: 6,
      surgeryPerformedAt: "2026-02-01T00:00:00.000Z",
    };
    renderPagina();

    expect(
      await screen.findByRole("button", { name: "Pós Cirúrgico" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Faturamento" }),
    ).not.toBeInTheDocument();
  });
});

describe("Detalhe da Solicitação — erros visíveis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
  });

  it("mostra toast quando a exportação do PDF falha", async () => {
    exportPdfMock.mockRejectedValue(new Error("Falha ao gerar PDF"));
    fixtureState.value = { ...base, status: 2 };
    renderPagina();

    const botao = await screen.findByRole("button", { name: /Exportar PDF/ });
    botao.click();

    expect(await screen.findByText("Falha ao gerar PDF")).toBeInTheDocument();
  });
});
