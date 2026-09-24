import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useHospitals", () => ({
  useHospitals: () => ({ data: [], isError: false }),
}));
vi.mock("@/hooks/useHealthPlans", () => ({
  useHealthPlans: () => ({ data: [], isError: false }),
}));
vi.mock("@/services/cid.service", () => ({
  cidService: { search: vi.fn().mockResolvedValue({ records: [] }) },
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const updateMock = vi.fn();
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { update: (...args: unknown[]) => updateMock(...args) },
}));

vi.mock("@/components/procedures/ProcedureQuickPickerModal", () => ({
  ProcedureQuickPickerModal: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (p: { id: string; name: string }) => void;
  }) =>
    isOpen ? (
      <button
        onClick={() => onSelect({ id: "proc-9", name: "Colecistectomia" })}
      >
        selecionar procedimento de teste
      </button>
    ) : null,
}));

import { EditableProcedureData } from "./EditableProcedureData";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";

const base = {
  id: "sc-1",
  hospital: null,
  cid: null,
  healthPlan: null,
  healthPlanRegistration: null,
  healthPlanType: null,
  procedure: null,
} as unknown as SurgeryRequestDetail;

describe("EditableProcedureData — procedimento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockResolvedValue({});
  });

  it("mostra 'Não informado' quando a SC não tem procedimento", () => {
    render(<EditableProcedureData solicitacao={base} />);

    const label = screen.getByText("Procedimento");
    const input = label.nextElementSibling as HTMLInputElement;
    expect(input).toHaveAttribute("placeholder", "Não informado");
    expect(input.value).toBe("");
  });

  it("mostra o nome do procedimento já vinculado", () => {
    render(
      <EditableProcedureData
        solicitacao={{
          ...base,
          procedure: { id: "proc-1", name: "Artroscopia de joelho" },
        }}
      />,
    );

    expect(screen.getByDisplayValue("Artroscopia de joelho")).toBeInTheDocument();
  });

  it("permite escolher o procedimento em modo edição e salvar", async () => {
    const user = userEvent.setup();
    render(<EditableProcedureData solicitacao={base} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(
      screen.getByRole("button", { name: /selecionar procedimento/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /selecionar procedimento de teste/i }),
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "sc-1",
        expect.objectContaining({ procedureId: "proc-9" }),
      );
    });
  });
});
