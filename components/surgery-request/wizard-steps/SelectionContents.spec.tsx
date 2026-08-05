import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/services/hospital.service", () => ({
  hospitalService: { getAll: vi.fn().mockResolvedValue([]) },
}));

const { procedureFixture } = vi.hoisted(() => ({
  procedureFixture: {
    id: "proc-1",
    name: "Artroscopia de joelho",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
}));

vi.mock("@/services/procedure.service", () => ({
  procedureService: {
    getAll: vi.fn().mockResolvedValue([procedureFixture]),
    delete: vi.fn(),
  },
}));

import {
  HospitalSelectionContent,
  ProcedureSelectionContent,
} from "./SelectionContents";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * Grupo 1 do mapa de permissões: criar hospital na hora exige Administração.
 * `canCreate` é passado pelo `CreateSurgeryRequestWizard` (que resolve
 * `can(Permission.ADMINISTRACAO)`) — este teste cobre o mecanismo de
 * desabilitar-com-dica em si, isolado do wizard completo.
 */
describe("HospitalSelectionContent — gating de criação (canCreate)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desabilita 'Novo' e explica o motivo quando falta Administração", () => {
    renderWithClient(
      <HospitalSelectionContent
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        canCreate={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Novo" })).toBeDisabled();
    expect(
      screen.getByText(/Peça a um administrador da conta para cadastrar/i),
    ).toBeInTheDocument();
  });

  it("mantém 'Novo' habilitado para quem tem Administração", () => {
    renderWithClient(
      <HospitalSelectionContent
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        canCreate={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Novo" })).toBeEnabled();
    expect(
      screen.queryByText(/Peça a um administrador/i),
    ).not.toBeInTheDocument();
  });
});

/**
 * `DELETE /procedures/:id` exige a mesma Administração que `POST` — a
 * lixeira por linha precisa sumir junto com o "Novo", não só ele. Sem essa
 * checagem, um colaborador com Solicitações e sem Administração (o perfil
 * que o wizard de SC serve) recebia o modal de confirmação e um 403 na
 * hora de confirmar.
 */
describe("ProcedureSelectionContent — gating de exclusão (canCreate)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("esconde a lixeira por linha quando falta Administração", async () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate={false}
      />,
    );

    expect(
      await screen.findByText("Artroscopia de joelho"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Excluir Artroscopia de joelho/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("mostra a lixeira por linha para quem tem Administração", async () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate={true}
      />,
    );

    expect(
      await screen.findByRole("button", {
        name: /Excluir Artroscopia de joelho/i,
      }),
    ).toBeInTheDocument();
  });
});
