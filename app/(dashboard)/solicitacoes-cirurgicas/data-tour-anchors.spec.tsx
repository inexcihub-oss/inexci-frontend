import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProcedimentosCirurgicos from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: false,
    user: { id: "user-1" },
    canCreateSurgeryRequest: true,
    blockReason: null,
    blockReasonCode: null,
    can: () => true,
    permissions: [],
  }),
}));

vi.mock("@/services/surgery-request.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/surgery-request.service")
  >();
  return {
    ...original,
    surgeryRequestService: {
      ...original.surgeryRequestService,
      getKanban: vi.fn().mockResolvedValue({ total: 0, records: [] }),
    },
  };
});

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
    getDoctorsForAccount: vi.fn().mockResolvedValue([]),
  },
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProcedimentosCirurgicos />
    </QueryClientProvider>,
  );
}

describe("Tela de Solicitações Cirúrgicas — âncoras do tour", () => {
  it("expõe data-tour=\"sc-nova\" no botão de nova solicitação", async () => {
    renderPagina();

    const botao = await screen.findByText("Nova solicitação");
    expect(botao.closest('[data-tour="sc-nova"]')).not.toBeNull();
  });

  it("expõe data-tour=\"sc-por-documento\" no botão de upload", async () => {
    renderPagina();

    const botao = await screen.findByTitle(
      "Criar solicitação a partir de documento",
    );
    expect(botao).toHaveAttribute("data-tour", "sc-por-documento");
  });

  it('expõe data-tour="sc-filtro" no botão de filtro', async () => {
    renderPagina();

    const botao = await screen.findByText("Filtro");
    expect(botao.closest('[data-tour="sc-filtro"]')).not.toBeNull();
  });

  it('expõe data-tour="sc-kanban-colunas" no board', async () => {
    renderPagina();

    await screen.findByText("Nova solicitação");
    expect(
      document.querySelector('[data-tour="sc-kanban-colunas"]'),
    ).not.toBeNull();
  });
});
