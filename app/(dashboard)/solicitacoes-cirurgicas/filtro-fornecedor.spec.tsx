import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProcedimentosCirurgicos from "./page";

/**
 * Fornecedor de uma solicitação é o ESCOLHIDO nos itens OPME — mesma definição
 * que a agenda e a tela do fornecedor já usam. Solicitação que ainda não
 * escolheu fornecedor não tem como casar com o filtro.
 */

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
  // Declarado dentro da fábrica: `vi.mock` sobe para o topo do arquivo e não
  // enxerga constante de módulo.
  const registros = [
    {
      id: 1,
      status: 5,
      protocol: "000001",
      priority: 2,
      createdAt: "2026-01-10T12:00:00.000Z",
      patient: { id: "p-1", name: "Ana Souza" },
      doctor: { id: "d-1", name: "House" },
      healthPlan: { id: "hp-1", name: "Unimed" },
      procedure: { id: "proc-1", name: "Artroscopia" },
      suppliers: [{ id: "f-1", name: "Sintex" }],
      pendenciesCount: 0,
    },
    {
      id: 2,
      status: 5,
      protocol: "000002",
      priority: 2,
      createdAt: "2026-01-11T12:00:00.000Z",
      patient: { id: "p-2", name: "Bruno Lima" },
      doctor: { id: "d-1", name: "House" },
      healthPlan: { id: "hp-1", name: "Unimed" },
      procedure: { id: "proc-1", name: "Artroscopia" },
      suppliers: [{ id: "f-2", name: "Baumer" }],
      pendenciesCount: 0,
    },
    {
      id: 3,
      status: 5,
      protocol: "000003",
      priority: 2,
      createdAt: "2026-01-12T12:00:00.000Z",
      patient: { id: "p-3", name: "Carla Dias" },
      doctor: { id: "d-1", name: "House" },
      healthPlan: { id: "hp-1", name: "Unimed" },
      procedure: { id: "proc-1", name: "Artroscopia" },
      suppliers: [],
      pendenciesCount: 0,
    },
  ];
  return {
    ...original,
    surgeryRequestService: {
      ...original.surgeryRequestService,
      getKanban: vi
        .fn()
        .mockResolvedValue({ total: registros.length, records: registros }),
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

async function filtrarPorFornecedor(
  user: ReturnType<typeof userEvent.setup>,
  nome: string,
) {
  await user.click(await screen.findByRole("button", { name: /Filtro/ }));
  const painel = await screen.findByRole("heading", { name: "Filtros" });
  const modal = painel.closest("div[class*='fixed']") as HTMLElement;
  await user.click(
    within(modal).getByPlaceholderText(/Pesquisar fornecedor/i),
  );
  await user.click(await within(modal).findByRole("button", { name: nome }));
  await user.click(
    within(modal).getByRole("button", { name: /Mostrar resultados/ }),
  );
}

describe("Kanban — filtro de fornecedores", () => {
  it("mantém só as solicitações do fornecedor escolhido", async () => {
    const user = userEvent.setup();
    renderPagina();

    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();

    await filtrarPorFornecedor(user, "Sintex");

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();
    // Sem fornecedor escolhido, não há como casar com o filtro.
    expect(screen.queryByText("Carla Dias")).not.toBeInTheDocument();
  });

  it("conta o fornecedor no contador de filtros ativos", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Ana Souza");

    await filtrarPorFornecedor(user, "Sintex");

    const botao = screen.getByRole("button", { name: /Filtro/ });
    expect(within(botao).getByText("1")).toBeInTheDocument();
  });

  it("só oferece fornecedores que aparecem nas solicitações carregadas", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Ana Souza");

    await user.click(screen.getByRole("button", { name: /Filtro/ }));
    const painel = await screen.findByRole("heading", { name: "Filtros" });
    const modal = painel.closest("div[class*='fixed']") as HTMLElement;
    await user.click(
      within(modal).getByPlaceholderText(/Pesquisar fornecedor/i),
    );

    expect(
      await within(modal).findByRole("button", { name: "Sintex" }),
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("button", { name: "Baumer" }),
    ).toBeInTheDocument();
  });
});
