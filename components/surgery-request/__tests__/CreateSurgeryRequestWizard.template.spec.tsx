import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import type { SurgeryRequestTemplateSummary } from "@/services/surgery-request.service";

const getTemplate = vi.fn();
const createSimple = vi.fn();
const addProcedures = vi.fn();
const opmeCreate = vi.fn();

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getTemplate: (...args: unknown[]) => getTemplate(...args),
    createSimple: (...args: unknown[]) => createSimple(...args),
    setHasOpme: vi.fn().mockResolvedValue(undefined),
    incrementTemplateUsage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/tuss.service", () => ({
  tussService: { addProcedures: (...args: unknown[]) => addProcedures(...args) },
}));

vi.mock("@/services/opme.service", () => ({
  opmeService: { create: (...args: unknown[]) => opmeCreate(...args) },
}));

// A referência precisa ser estável: o wizard auto-seleciona o médico único num
// efeito que depende do array, e um literal novo a cada render vira loop.
const MEDICOS = [{ id: "doc-1", name: "Dr. João", status: "active" }];
const RESULTADO_MEDICOS = { data: MEDICOS, isLoading: false };
vi.mock("@/hooks/useAvailableDoctors", () => ({
  useAvailableDoctors: () => RESULTADO_MEDICOS,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions: [Permission.SOLICITACOES],
    can: (p: Permission) => p === Permission.SOLICITACOES,
  }),
}));

// As telas de seleção não são o objeto deste teste; o que importa é o que o
// submit dispara depois que o modelo foi aplicado.
vi.mock("../wizard-steps/SelectionContents", () => ({
  ProcedureSelectionContent: () => null,
  // O paciente é o único campo que o modelo não preenche; o botão abaixo faz o
  // papel da lista real para destravar o submit.
  PatientSelectionContent: ({
    onSelect,
  }: {
    onSelect: (p: { id: string; name: string }) => void;
  }) => (
    <button onClick={() => onSelect({ id: "pac-1", name: "Paciente Teste" })}>
      escolher-paciente
    </button>
  ),
  HospitalSelectionContent: () => null,
  HealthPlanSelectionContent: () => null,
  DoctorSelectionContent: () => null,
  TemplateSelectionContent: () => null,
}));

import { CreateSurgeryRequestWizard } from "../CreateSurgeryRequestWizard";

const modelo: SurgeryRequestTemplateSummary = {
  id: "tpl-1",
  name: "Modelo - Coluna",
  procedureId: "proc-1",
  procedureName: "Artrodese lombar",
  hospitalId: "hosp-1",
  hospitalName: "Hospital Central",
  healthPlanId: "plan-1",
  healthPlanName: "SULAMERICA",
  priority: 3,
  doctorName: "Dr. João",
  usageCount: 1,
  createdAt: "2026-08-08T06:25:56.810Z",
  updatedAt: "2026-08-08T06:26:28.608Z",
};

function renderizar() {
  return render(
    <CreateSurgeryRequestWizard
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      initialTemplate={modelo}
    />,
  );
}

/** Preenche o paciente e dispara a criação. */
async function criarSolicitacao() {
  await userEvent.click(
    screen.getByRole("button", { name: "escolher-paciente" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Nova solicitação" }),
  );
}

describe("CreateSurgeryRequestWizard — criação a partir de modelo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSimple.mockResolvedValue({ id: "sc-1" });
    addProcedures.mockResolvedValue(undefined);
    opmeCreate.mockResolvedValue(undefined);
    getTemplate.mockResolvedValue({
      id: "tpl-1",
      name: "Modelo - Coluna",
      usageCount: 1,
      createdAt: "2026-08-08T06:25:56.810Z",
      updatedAt: "2026-08-08T06:26:28.608Z",
      templateData: {
        tussItems: [
          { tussCode: "3.07.15.09-1", name: "Cauda equina L4-L5", quantity: 2 },
          { tussCode: "3.07.15.09-1", name: "Cauda equina L5", quantity: 1 },
        ],
        opmeItems: [
          {
            name: "Kit endoscopia",
            quantity: 1,
            manufacturers: ["Outros"],
            suppliers: ["Sintex", "BW Medic", "Lais Brasil"],
          },
        ],
      },
    });
  });

  it("aplica prioridade, procedimento, hospital e convênio do resumo", () => {
    renderizar();

    expect(screen.getByText("Artrodese lombar")).toBeInTheDocument();
    expect(screen.getByText("Hospital Central")).toBeInTheDocument();
    expect(screen.getByText("SULAMERICA")).toBeInTheDocument();
    // priority 3 = Alta; vem do modelo, não do padrão (Baixa).
    expect(screen.getByText("Alta")).toBeInTheDocument();
    // Aplicar o modelo não busca o conteúdo — isso fica para o submit.
    expect(getTemplate).not.toHaveBeenCalled();
  });

  it("busca o conteúdo do modelo antes de criar a solicitação", async () => {
    renderizar();

    await criarSolicitacao();

    await waitFor(() => expect(createSimple).toHaveBeenCalled());
    expect(getTemplate).toHaveBeenCalledWith("tpl-1");
    expect(getTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      createSimple.mock.invocationCallOrder[0],
    );
  });

  it("não cria a solicitação quando o conteúdo do modelo falha", async () => {
    getTemplate.mockRejectedValue(new Error("timeout"));
    renderizar();

    await criarSolicitacao();

    await waitFor(() =>
      expect(screen.getByText(/Erro ao criar solicitação/i)).toBeInTheDocument(),
    );
    expect(createSimple).not.toHaveBeenCalled();
  });

  it("deduplica o TUSS repetido e completa o OPME com 'Outros'", async () => {
    renderizar();

    await criarSolicitacao();

    await waitFor(() => expect(addProcedures).toHaveBeenCalled());
    expect(addProcedures).toHaveBeenCalledWith({
      surgeryRequestId: "sc-1",
      procedures: [
        { tussCode: "3.07.15.09-1", name: "Cauda equina L4-L5", quantity: 2 },
      ],
    });
    expect(opmeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturerNames: ["Outros", "Outros", "Outros"],
        supplierNames: ["Sintex", "BW Medic", "Lais Brasil"],
      }),
    );
  });
});
