import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClinicasPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: () => true,
  }),
}));

vi.mock("@/services/clinic.service", () => ({
  clinicService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClinicasPage />
    </QueryClientProvider>,
  );
}

describe("Tela de Clínicas — âncoras do tour", () => {
  it('expõe data-tour="cadastros-clinicas" no botão de nova clínica', async () => {
    renderPagina();

    const botao = await screen.findByText("Nova clínica");
    expect(botao.closest('[data-tour="cadastros-clinicas"]')).not.toBeNull();
  });
});
