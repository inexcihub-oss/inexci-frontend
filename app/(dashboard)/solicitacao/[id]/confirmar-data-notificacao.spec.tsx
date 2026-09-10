import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SolicitacaoDetalhePage from "./page";

/**
 * "Em Agendamento" (4) sem datas propostas confirma a cirurgia pelo modal
 * "Definir Data da Cirurgia". A transição é a mesma de quando há datas
 * propostas — logo, o convite para notificar o paciente também precisa
 * aparecer nesse caminho.
 */

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sc-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
    status: 4,
    protocol: "SC-0001",
    priority: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    observations: null,
    procedureName: "Artroscopia de joelho",
    patient: {
      id: "pat-1",
      name: "Paciente Teste",
      phone: "11999999999",
      email: "paciente@teste.com",
    },
    doctor: { id: "doc-1", name: "Dr. Teste", doctorProfile: {} },
    hospital: { id: "hosp-1", name: "Hospital Teste" },
    healthPlan: { id: "hp-1", name: "Convênio Teste" },
    procedure: { id: "proc-1", name: "Artroscopia de joelho" },
    tussProcedure: null,
    tussItems: [],
    opmeItems: [],
    // Termo de consentimento já anexado: o aviso não-bloqueante não entra no meio.
    documents: [{ id: "doc-file-1", key: "consent_term", type: "consent_term" }],
    sections: [],
    activities: [],
    contestations: [],
    pendencies: [],
    analysis: null,
    billing: null,
    receipt: null,
    // Sem datas propostas — é o que leva ao modal "Definir Data da Cirurgia".
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

const updateDateOptions = vi.fn().mockResolvedValue(undefined);
const confirmDate = vi.fn().mockResolvedValue(undefined);

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
      updateDateOptions: (...args: unknown[]) => updateDateOptions(...args),
      confirmDate: (...args: unknown[]) => confirmDate(...args),
      notify: vi.fn().mockResolvedValue(undefined),
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
        currentStatus: 4,
        statusLabel: "Em Agendamento",
        pendencies: [],
        canAdvance: true,
        nextStatus: 5,
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

describe('Detalhe da Solicitação — notificação após "Definir Data"', () => {
  it("convida a notificar o paciente ao confirmar a data sem datas propostas", async () => {
    const user = userEvent.setup();
    renderPagina();

    const abrirDefinicao = await screen.findByRole("button", {
      name: "Confirmar Data",
    });
    await user.click(abrirDefinicao);

    await screen.findByText("Definir Data da Cirurgia");
    const campoData = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    await user.type(campoData, "2026-12-01T08:00");

    const confirmar = screen.getAllByRole("button", {
      name: "Confirmar Data",
    });
    await user.click(confirmar[confirmar.length - 1]);

    await waitFor(() => expect(confirmDate).toHaveBeenCalled());

    expect(
      await screen.findByRole("heading", { name: "Notificar paciente" }),
    ).toBeInTheDocument();
  });
});
