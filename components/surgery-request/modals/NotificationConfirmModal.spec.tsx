import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationConfirmModal } from "./NotificationConfirmModal";

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

  it("deve exibir texto de comunicação da atualização", () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    expect(
      screen.getByText(/selecione como deseja comunicar a atualização/i),
    ).toBeInTheDocument();
  });

  it('botão "Não quero notificar" deve chamar onConfirm(null)', () => {
    render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Não quero notificar"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(null);
  });

  it('botão "Notificar paciente" deve chamar onConfirm com canais selecionados', () => {
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

  it('deve exibir "Enviando..." quando isLoading=true e paciente tem contato', () => {
    render(
      <NotificationConfirmModal
        {...defaultProps}
        isLoading={true}
        patientEmail="p@test.com"
      />,
    );
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
    const backdrop = document.querySelector(".bg-black\\/50");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("não deve fechar ao clicar no backdrop durante loading", () => {
    render(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    const backdrop = document.querySelector(".bg-black\\/50");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("renderiza em portal como dialog nomeado pelo título", () => {
    const { container } = render(
      <NotificationConfirmModal {...defaultProps} />,
    );
    const dialog = screen.getByRole("dialog", { name: /Notificar paciente/ });
    expect(container.contains(dialog)).toBe(false);
  });

  it("fecha com Esc e ignora Esc durante loading", () => {
    const { rerender } = render(<NotificationConfirmModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    rerender(<NotificationConfirmModal {...defaultProps} isLoading={true} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
