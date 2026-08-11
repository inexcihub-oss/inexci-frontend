import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/patient.service", () => ({
  patientService: {
    list: vi.fn().mockResolvedValue({
      records: [
        {
          id: "p-1",
          name: "Ana Beatriz",
          cpf: "12345678900",
          email: "ana@exemplo.com",
          phone: "11988880000",
          birthDate: "1990-01-01",
        },
      ],
      total: 1,
    }),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

// O mock deriva `can` de `permissions` em vez de trazer os dois soltos: com
// duas fontes, um teste passa a afirmar uma combinação que o AuthContext real
// nunca produz (ex.: `can(ADMINISTRACAO)` verdadeiro com `permissions` vazio).
let permissions: Permission[] = [Permission.ADMINISTRACAO];
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

import PacientesPage from "./page";

/**
 * Grupo 3 do mapa: em pacientes, só excluir (individual, em lote e a coluna
 * de seleção) exige Administração — criar e editar paciente são abertos e
 * NÃO devem ser escondidos.
 */
describe("PacientesPage — gating por Administração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions = [Permission.ADMINISTRACAO];
  });

  it("esconde excluir e a coluna de seleção, mas mantém 'Novo paciente' para quem não tem Administração", async () => {
    permissions = [Permission.SOLICITACOES];
    render(<PacientesPage />);

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Novo paciente/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Excluir paciente")).not.toBeInTheDocument();
  });

  it("mostra excluir e a coluna de seleção para quem tem Administração", async () => {
    render(<PacientesPage />);

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Excluir paciente")).toBeInTheDocument();
  });
});
