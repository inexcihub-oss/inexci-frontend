import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import userEvent from "@testing-library/user-event";
import { InvoiceModal } from "./InvoiceModal";
import {
  surgeryRequestService,
  type SurgeryRequestDetail,
} from "@/services/surgery-request.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { invoice: vi.fn() },
}));

const solicitacao = {
  id: "sc-1",
  patient: { id: "p1", name: "Paciente" },
  procedure: { id: "pr1", name: "Artroscopia" },
  healthPlan: { id: "hp1", name: "Unimed", defaultPaymentDays: null },
} as unknown as SurgeryRequestDetail;

describe("InvoiceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.invoice).mockResolvedValue({});
  });

  it("valida os obrigatórios com o schema e não chama a API", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <InvoiceModal
        isOpen
        onClose={vi.fn()}
        solicitacao={solicitacao}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Concluir faturamento" }),
    );

    expect(
      await screen.findByText("Preencha: Nº do protocolo, Valor faturado"),
    ).toBeInTheDocument();
    expect(surgeryRequestService.invoice).not.toHaveBeenCalled();
  });

  it("envia o payload montado a partir do formulário", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(
      <InvoiceModal
        isOpen
        onClose={vi.fn()}
        solicitacao={solicitacao}
        onSuccess={onSuccess}
      />,
    );

    await user.type(screen.getByPlaceholderText("Ex: 2024000123"), "PROT-9");
    await user.type(screen.getByPlaceholderText("R$ 0,00"), "250000");
    await user.click(
      screen.getByRole("button", { name: "Concluir faturamento" }),
    );

    await waitFor(() =>
      expect(surgeryRequestService.invoice).toHaveBeenCalledWith(
        "sc-1",
        expect.objectContaining({
          invoiceProtocol: "PROT-9",
          invoiceValue: 2500,
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("InvoiceModal — casca do modal", () => {
  it("renderiza em portal como dialog e fecha com Esc", async () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <InvoiceModal
        isOpen
        onClose={onClose}
        solicitacao={solicitacao}
        onSuccess={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /Faturamento/ });
    expect(container.contains(dialog)).toBe(false);
    expect(
      screen.getByText("Solicitação cirúrgica · Paciente"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nº do protocolo")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor faturado")).toBeInTheDocument();

    const userEsc = userEvent.setup();
    await userEsc.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("não renderiza nada fechado", () => {
    renderWithProviders(
      <InvoiceModal
        isOpen={false}
        onClose={vi.fn()}
        solicitacao={solicitacao}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
