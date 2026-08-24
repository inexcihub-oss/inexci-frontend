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
 * `canCreate` é resolvido pelo `CreateSurgeryRequestWizard` (hoje, `hasAnyArea`
 * — hospital é cadastro transversal). Este teste cobre o mecanismo de
 * desabilitar-com-dica em si, isolado de qual regra o wizard usa para decidir.
 */
describe("HospitalSelectionContent — gating de criação (canCreate)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desabilita 'Novo' e explica o motivo quando não pode criar", () => {
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

  it("mantém 'Novo' habilitado para quem pode criar", () => {
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
 * Criar e excluir procedimento deixaram de andar juntos: `POST /procedures`
 * herda o `@RequireAnyArea()` da classe, `DELETE /procedures/:id` continua em
 * Administração. Enquanto uma prop só governava os dois, liberar a criação
 * teria trazido a lixeira junto — modal de confirmação e 403 ao confirmar.
 */
describe("ProcedureSelectionContent — criar e excluir são props separadas", () => {
  beforeEach(() => vi.clearAllMocks());

  const lixeira = { name: /Excluir Artroscopia de joelho/i } as const;

  it("esconde a lixeira quando falta Administração, mesmo podendo criar", async () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate
        canDelete={false}
      />,
    );

    expect(await screen.findByText("Artroscopia de joelho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo" })).toBeEnabled();
    expect(screen.queryByRole("button", lixeira)).not.toBeInTheDocument();
  });

  it("mostra a lixeira para quem tem Administração", async () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate
        canDelete
      />,
    );

    expect(await screen.findByRole("button", lixeira)).toBeInTheDocument();
  });

  it("desabilita 'Novo' de quem não tem área nenhuma, sem mexer na lixeira", async () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate={false}
        canDelete
      />,
    );

    expect(await screen.findByText("Artroscopia de joelho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo" })).toBeDisabled();
    expect(screen.getByRole("button", lixeira)).toBeInTheDocument();
  });

  /**
   * `sc-wizard-novo-cadastro` é a âncora que o tour de onboarding usa para
   * destacar o botão "Novo" dentro do wizard (`tour-registry.ts`, passo
   * "cadastro-no-modal"). Sem este teste, trocar ou remover o atributo aqui
   * não quebra nada visivelmente — o tour só passa a pular o passo em
   * silêncio (`useTargetRect` reporta "ausente").
   */
  it("expõe a âncora do tour no botão 'Novo'", () => {
    renderWithClient(
      <ProcedureSelectionContent
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onNewItemCreated={vi.fn()}
        isActive
        canCreate
      />,
    );

    expect(screen.getByRole("button", { name: "Novo" })).toHaveAttribute(
      "data-tour",
      "sc-wizard-novo-cadastro",
    );
  });
});
