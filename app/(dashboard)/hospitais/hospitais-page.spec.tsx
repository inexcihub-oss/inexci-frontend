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

let permissions: Permission[] = [Permission.ADMINISTRACAO];
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
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
 * `createDeleteActionColumn` de `components/shared/cadastro-table-columns`.
 * Este teste cobre o mecanismo através de uma das telas; as outras usam
 * exatamente o mesmo código.
 *
 * São dois eixos, não um: **cadastrar** é transversal (qualquer área, espelho
 * do `@RequireAnyArea()`), **excluir** continua exigindo Administração.
 */
describe("HospitaisPage — cadastrar vs. excluir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions = [Permission.ADMINISTRACAO];
  });

  it("deixa o colaborador de qualquer área cadastrar, mas não excluir", async () => {
    permissions = [Permission.SOLICITACOES];
    renderPage();

    expect(await screen.findByText("Hospital São Lucas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Novo hospital/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Excluir hospital")).not.toBeInTheDocument();
  });

  it("esconde tudo de quem não tem área nenhuma", async () => {
    permissions = [];
    renderPage();

    expect(await screen.findByText("Hospital São Lucas")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Novo hospital/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Excluir hospital")).not.toBeInTheDocument();
  });

  it("mostra criar, excluir e a coluna de seleção para quem tem Administração", async () => {
    renderPage();

    expect(await screen.findByText("Hospital São Lucas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Novo hospital/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Excluir hospital")).toBeInTheDocument();
  });
});
