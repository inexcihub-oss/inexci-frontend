import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationConfirmModal } from "../NotificationConfirmModal";

describe("NotificationConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentStatus: "Pendente",
    newStatus: "Enviada",
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando isOpen=false", () => {
    render(<NotificationConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Notificar paciente")).not.toBeInTheDocument();
  });

  it("renderiza status atual e novo", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("Enviada")).toBeInTheDocument();
  });

  it("chama onConfirm(null) ao clicar 'Não quero notificar'", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Não quero notificar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(null);
  });

  it("chama onConfirm com canais ao clicar 'Notificar paciente'", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="p@test.com"
        patientPhone="11999999999"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notificar paciente" }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ email: true, whatsapp: true }),
    );
  });

  it("mostra canal E-mail disponível quando paciente tem email", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
      />,
    );
    expect(screen.getByText("paciente@test.com")).toBeInTheDocument();
  });

  it("mostra canal WhatsApp disponível quando paciente tem telefone", () => {
    render(
      <NotificationConfirmModal {...defaultProps} patientPhone="11999999999" />,
    );
    expect(screen.getByText("11999999999")).toBeInTheDocument();
  });

  it("mostra ambos canais disponíveis", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
        patientPhone="11999999999"
      />,
    );
    expect(screen.getByText("paciente@test.com")).toBeInTheDocument();
    expect(screen.getByText("11999999999")).toBeInTheDocument();
  });

  it("mostra aviso quando paciente não tem nenhum dado de contato", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(
      screen.getByText(/não possui e-mail nem telefone cadastrado/),
    ).toBeInTheDocument();
  });

  it("exibe 'Não cadastrado' para canais indisponíveis individualmente", () => {
    render(
      <NotificationConfirmModal {...defaultProps} patientPhone="11999999999" />,
    );
    expect(screen.getAllByText("Não cadastrado").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("exibe 'Não cadastrado' quando falta apenas telefone", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
      />,
    );
    expect(screen.getAllByText("Não cadastrado").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("mostra 'Enviando...' quando isLoading=true e há canal disponível", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        isLoading={true}
        patientEmail="p@test.com"
      />,
    );
    expect(screen.getByText("Enviando...")).toBeInTheDocument();
  });
});
