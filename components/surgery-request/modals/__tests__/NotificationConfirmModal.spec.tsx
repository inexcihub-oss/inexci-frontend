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

  it("chama onConfirm(false) ao clicar 'Apenas alterar'", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Apenas alterar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(false);
  });

  it("chama onConfirm(true) ao clicar 'Sim, notificar'", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Sim, notificar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(true);
  });

  it("mostra canal E-mail disponível quando paciente tem email", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
      />,
    );
    expect(screen.getByText(/E-mail ✓/)).toBeInTheDocument();
  });

  it("mostra canal WhatsApp disponível quando paciente tem telefone", () => {
    render(
      <NotificationConfirmModal {...defaultProps} patientPhone="11999999999" />,
    );
    expect(screen.getByText(/WhatsApp ✓/)).toBeInTheDocument();
  });

  it("mostra ambos canais disponíveis", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
        patientPhone="11999999999"
      />,
    );
    expect(screen.getByText(/E-mail ✓/)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp ✓/)).toBeInTheDocument();
  });

  it("mostra canais indisponíveis quando paciente não tem dados", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(screen.getByText(/E-mail ✗/)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp ✗/)).toBeInTheDocument();
  });

  it("exibe alerta quando paciente não tem nenhum dado de contato", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(
      screen.getByText(/não possui e-mail nem telefone cadastrado/),
    ).toBeInTheDocument();
  });

  it("exibe alerta parcial quando falta apenas e-mail", () => {
    render(
      <NotificationConfirmModal {...defaultProps} patientPhone="11999999999" />,
    );
    expect(
      screen.getByText(/sem e-mail cadastrado.*apenas por WhatsApp/i),
    ).toBeInTheDocument();
  });

  it("exibe alerta parcial quando falta apenas telefone", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
      />,
    );
    expect(
      screen.getByText(/sem telefone cadastrado.*apenas por e-mail/i),
    ).toBeInTheDocument();
  });

  it("não exibe nenhum alerta quando ambos os dados existem", () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        patientEmail="paciente@test.com"
        patientPhone="11999999999"
      />,
    );
    expect(screen.queryByText(/não possui e-mail/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem e-mail cadastrado/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/sem telefone cadastrado/),
    ).not.toBeInTheDocument();
  });

  it("mostra 'Enviando...' quando isLoading=true", () => {
    render(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Enviando...")).toBeInTheDocument();
  });
});
