import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";
import { ProcedureModel } from "./types";

vi.mock("@/services/procedure.service", () => ({
  procedureService: { getAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/services/supplier.service", () => ({
  supplierService: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));

vi.mock("@/services/manufacturer.service", () => ({
  manufacturerService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { updateTemplate: vi.fn() },
}));

let authState = { can: (p: Permission) => p === Permission.SOLICITACOES };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import { ProcedureSideSheet } from "./ProcedureSideSheet";

const procedure: ProcedureModel & { _raw?: unknown } = {
  id: "tpl-1",
  modelName: "Artroscopia padrão",
  procedureName: "Artroscopia de joelho",
  createdAt: "01/01/2026",
  createdBy: "Dr. João",
  usageCount: 2,
  documents: [],
  opmeItems: [],
  tussItems: [],
  _raw: { id: "tpl-1", templateData: {} },
};

/**
 * Grupo 3 do mapa (achado da auditoria corrigido): os "modelos" desta tela
 * são `SurgeryRequestTemplate` — `PATCH /surgery-requests/templates/:id`
 * herda `Permission.SOLICITACOES` do controller de solicitações cirúrgicas,
 * não Administração como hospitais/convênios/fornecedores/fabricantes.
 */
describe("ProcedureSideSheet — gating por Solicitações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.SOLICITACOES };
  });

  it("esconde a edição do modelo para quem não tem Solicitações", () => {
    authState = { can: () => false };
    render(
      <ProcedureSideSheet
        isOpen
        onClose={vi.fn()}
        procedure={procedure}
        onUseTemplate={vi.fn()}
        onTemplateUpdated={vi.fn()}
      />,
    );

    // "Adicionar" (documentos) e "Editar" (OPME/TUSS) não aparecem.
    expect(
      screen.queryByRole("button", { name: /Adicionar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: /Editar/i }),
    ).toHaveLength(0);
    // "Usar modelo" continua disponível — usar o modelo não é editá-lo.
    expect(
      screen.getByRole("button", { name: /Usar modelo/i }),
    ).toBeInTheDocument();
  });

  it("mostra a edição do modelo para quem tem Solicitações", () => {
    render(
      <ProcedureSideSheet
        isOpen
        onClose={vi.fn()}
        procedure={procedure}
        onUseTemplate={vi.fn()}
        onTemplateUpdated={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: /Adicionar/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Editar/i }).length,
    ).toBeGreaterThan(0);
  });
});
