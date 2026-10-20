import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Permission } from "@/lib/permissions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { getAll, remove, removeMany } = vi.hoisted(() => ({
  getAll: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
}));
vi.mock("@/services/manufacturer.service", () => ({
  manufacturerService: { getAll, delete: remove, deleteMany: removeMany },
}));

let permissions: Permission[] = [Permission.ADMINISTRACAO];
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

import FabricantesPage from "./page";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FabricantesPage />
    </QueryClientProvider>,
  );
}

describe("FabricantesPage (lista genérica de cadastro)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions = [Permission.ADMINISTRACAO];
    getAll.mockResolvedValue([
      {
        id: "m-1",
        name: "Stryker",
        anvisaRegistration: "10392710",
        country: "EUA",
        createdAt: "",
        updatedAt: "",
      },
      { id: "m-2", name: "Zimmer", createdAt: "", updatedAt: "" },
    ]);
    remove.mockResolvedValue(undefined);
  });

  it("carrega pelo cache (useManufacturers) com as colunas próprias", async () => {
    renderPage();
    expect(await screen.findByText("Stryker")).toBeInTheDocument();
    expect(screen.getByText("Registro ANVISA")).toBeInTheDocument();
    expect(screen.getByText("10392710")).toBeInTheDocument();
    expect(screen.getByText("País")).toBeInTheDocument();
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it("abre o detalhe ao clicar no nome", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Zimmer"));
    expect(push).toHaveBeenCalledWith("/colaboradores/fabricante/m-2");
  });

  it("exclui um fabricante e o tira da lista", async () => {
    renderPage();
    await screen.findByText("Stryker");
    fireEvent.click(screen.getAllByTitle("Excluir fabricante")[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("m-1"));
    await waitFor(() => expect(screen.queryByText("Stryker")).toBeNull());
  });

  it("quem não tem Administração cadastra, mas não exclui", async () => {
    permissions = [Permission.AGENDA];
    renderPage();
    await screen.findByText("Stryker");
    expect(
      screen.getByRole("button", { name: /Novo fabricante/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("Excluir fabricante")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
