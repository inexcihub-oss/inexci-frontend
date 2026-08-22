import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PacientesPage from "./page";

/**
 * Prova que a tela real de pacientes carrega a âncora `data-tour` que o tour
 * de onboarding (`lib/onboarding/tour-registry.ts`) espera encontrar —
 * "cadastros-pacientes". Sem este teste, remover o atributo (ou trocar o
 * elemento) quebra o tour em silêncio: `useTargetRect` só reporta "ausente" e
 * o passo é pulado, sem nenhum erro visível em dev.
 */

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
