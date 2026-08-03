import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Permission } from "@/lib/permissions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/hospital.service", () => ({
  hospitalService: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: "h-1",
        name: "Hospital São Lucas",
        cnpj: "12345678000199",
        email: "contato@saolucas.com",
        phone: "1133334444",
      },
    ]),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

let authState = { can: (p: Permission) => p === Permission.ADMINISTRACAO };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import HospitaisPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HospitaisPage />
    </QueryClientProvider>,
  );
}

/**
 * Grupo 3 do mapa: cadastros básicos (hospitais/convênios/fornecedores/
 * fabricantes) compartilham o mesmo mecanismo — `createSelectColumn` /
 * `createDeleteActionColumn` de `components/shared/cadastro-table-columns`,
 * gateados por Administração. Este teste cobre o mecanismo através de uma
 * das cinco telas; as outras quatro usam exatamente o mesmo código.
 */
describe("HospitaisPage — gating por Administração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.ADMINISTRACAO };
  });

  it("esconde criar, excluir e a coluna de seleção para quem não tem Administração", async () => {
    authState = { can: () => false };
    renderPage();

    expect(
      await screen.findByText("Hospital São Lucas"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Novo hospital/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("Excluir hospital"),
    ).not.toBeInTheDocument();
  });

  it("mostra criar, excluir e a coluna de seleção para quem tem Administração", async () => {
    renderPage();

    expect(
      await screen.findByText("Hospital São Lucas"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Novo hospital/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Excluir hospital")).toBeInTheDocument();
  });
});
