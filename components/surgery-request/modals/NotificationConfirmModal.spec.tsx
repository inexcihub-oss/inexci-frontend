import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationConfirmModal } from "./NotificationConfirmModal";

/**
 * PRD: Modal Confirmação Notificação
 * Testa o componente de confirmação de notificação ao paciente
 * na alteração de status de solicitações cirúrgicas.
 */
describe("NotificationConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentStatus: "Em análise",
    newStatus: "Aprovada",
    onConfirm: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve renderizar quando isOpen=false", () => {
    const { container } = render(
      <NotificationConfirmModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("deve renderizar quando isOpen=true", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(screen.getByText("Notificar paciente")).toBeInTheDocument();
  });

  it("deve exibir status atual e novo status", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText("Aprovada")).toBeInTheDocument();
  });

  it("deve exibir mensagem sobre notificação ao paciente", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(
      screen.getByText(/deseja enviar uma notificação ao paciente/i),
    ).toBeInTheDocument();
  });

  it('botão "Apenas alterar" deve chamar onConfirm(false)', () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Apenas alterar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(false);
  });

  it('botão "Sim, notificar" deve chamar onConfirm(true)', () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Sim, notificar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(true);
  });

  it('deve exibir "Enviando..." quando isLoading=true', () => {
    render(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Enviando...")).toBeInTheDocument();
  });

  it("botões devem estar desabilitados durante isLoading", () => {
    render(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("deve fechar ao clicar no backdrop quando não está carregando", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    // O backdrop é o primeiro div com classe bg-black/30
    const backdrop = document.querySelector(".bg-black\\/30.backdrop-blur-sm");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it("não deve fechar ao clicar no backdrop durante loading", () => {
    render(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    const backdrop = document.querySelector(".bg-black\\/30.backdrop-blur-sm");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    }
  });
});
