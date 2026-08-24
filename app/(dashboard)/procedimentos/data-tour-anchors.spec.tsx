import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProcedimentosPage from "./page";

/**
 * Prova que a tela real de procedimentos carrega a âncora `data-tour` que o
 * tour de onboarding (`lib/onboarding/tour-registry.ts`) espera encontrar —
 * "cadastros-procedimentos". Sem este teste, remover o atributo (ou trocar o
 * elemento) quebra o tour em silêncio: `useTargetRect` só reporta "ausente" e
 * o passo é pulado, sem nenhum erro visível em dev.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: () => true,
    permissions: [],
    isAdmin: false,
    canCreateSurgeryRequest: true,
    blockReason: null,
    blockReasonCode: null,
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
      getTemplates: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getDoctorsForAccount: vi.fn().mockResolvedValue([]),
  },
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProcedimentosPage />
    </QueryClientProvider>,
  );
}

describe("Tela de Procedimentos — âncoras do tour", () => {
  it('expõe data-tour="cadastros-procedimentos" no botão de novo modelo', async () => {
    renderPagina();

    const botao = await screen.findByText("Novo modelo");
    expect(
      botao.closest('[data-tour="cadastros-procedimentos"]'),
    ).not.toBeNull();
  });

  it('expõe data-tour="procedimentos-modelo-nome" no campo de nome, dentro do modal', async () => {
    renderPagina();

    const botaoNovoModelo = await screen.findByText("Novo modelo");
    await userEvent.setup().click(botaoNovoModelo);

    // Aguarda o modal e o input aparecerem
    await screen.findByPlaceholderText("Ex: Artroplastia padrão Bradesco");

    expect(
      document.querySelector('[data-tour="procedimentos-modelo-nome"]'),
    ).not.toBeNull();
  });
});
