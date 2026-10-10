import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestProviders } from "@/test-utils/render-with-providers";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import ProcedimentosCirurgicos from "./page";

let gerarPdf: () => Promise<void> = async () => {};

vi.mock("@/lib/export-surgery-requests", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/export-surgery-requests")
  >();
  return { ...original, exportToPdf: () => gerarPdf() };
});


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
    <TestProviders queryClient={queryClient}>
      <ProcedimentosCirurgicos />
    </TestProviders>,
  );
}

describe("Solicitações — exportar relatório em PDF", () => {
  beforeEach(() => {
    gerarPdf = async () => {};
  });

  async function abrirMenuExportar(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: /Exportar/ }));
  }

  it("avisa o usuário quando a geração do PDF falha", async () => {
    const user = userEvent.setup();
    gerarPdf = async () => {
      throw new Error("pdf-lib indisponível");
    };

    renderPagina();
    await abrirMenuExportar(user);
    await user.click(screen.getByRole("button", { name: /Exportar PDF/ }));

    expect(
      await screen.findByText(/Erro ao gerar o PDF/i),
    ).toBeInTheDocument();
  });

  it("mostra que está gerando enquanto o PDF não fica pronto", async () => {
    const user = userEvent.setup();
    let liberar: () => void = () => {};
    gerarPdf = () =>
      new Promise<void>((resolve) => {
        liberar = resolve;
      });

    renderPagina();
    await abrirMenuExportar(user);
    await user.click(screen.getByRole("button", { name: /Exportar PDF/ }));

    expect(await screen.findByText(/Gerando/i)).toBeInTheDocument();

    liberar();
    await waitFor(() =>
      expect(screen.queryByText(/Gerando/i)).not.toBeInTheDocument(),
    );
  });
});
