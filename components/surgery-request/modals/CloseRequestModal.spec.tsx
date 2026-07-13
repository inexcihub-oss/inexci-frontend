import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CloseRequestModal } from "./CloseRequestModal";
import { surgeryRequestService } from "@/services/surgery-request.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    close: vi.fn(),
  },
}));

describe("CloseRequestModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    surgeryRequestId: "sc-1",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.close).mockResolvedValue({});
  });

  it("não deve renderizar quando isOpen=false", () => {
    const { container } = render(
      <CloseRequestModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("deve exibir o campo de motivo do encerramento", () => {
    render(<CloseRequestModal {...defaultProps} />);
    expect(
      screen.getByText("Motivo do encerramento (opcional)"),
    ).toBeInTheDocument();
  });

  it("deve enviar o motivo digitado ao confirmar", async () => {
    render(<CloseRequestModal {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Descreva o motivo do encerramento para consulta futura...",
      ),
      { target: { value: "Paciente desistiu do procedimento" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }));

    await waitFor(() => {
      expect(surgeryRequestService.close).toHaveBeenCalledWith("sc-1", {
        reason: "Paciente desistiu do procedimento",
      });
    });
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it("deve enviar reason=undefined quando o motivo não é preenchido", async () => {
    render(<CloseRequestModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }));

    await waitFor(() => {
      expect(surgeryRequestService.close).toHaveBeenCalledWith("sc-1", {
        reason: undefined,
      });
    });
  });
});
