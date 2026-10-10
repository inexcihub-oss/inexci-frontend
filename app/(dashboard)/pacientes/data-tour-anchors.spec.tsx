import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
import PacientesPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: () => true,
    permissions: [],
  }),
}));

vi.mock("@/services/patient.service", () => ({
  patientService: {
    list: vi.fn().mockResolvedValue({ records: [], total: 0 }),
  },
}));

describe("Tela de Pacientes — âncoras do tour", () => {
  it('expõe data-tour="cadastros-pacientes" no botão de novo paciente', async () => {
    render(<PacientesPage />);

    const botao = await screen.findByText("Novo paciente");
    expect(botao.closest('[data-tour="cadastros-pacientes"]')).not.toBeNull();
  });
});
