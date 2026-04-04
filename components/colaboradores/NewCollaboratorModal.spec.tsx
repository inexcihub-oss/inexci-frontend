import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCollaboratorModal } from "./NewCollaboratorModal";

// Mock do collaboratorService
vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    create: vi.fn(),
  },
}));

import { collaboratorService } from "@/services/collaborator.service";

/**
 * PRD: Reformulação Usuários/Permissões — US-004
 * Testa o modal de criação de colaborador.
 */
describe("NewCollaboratorModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve renderizar quando isOpen=false", () => {
    const { container } = render(
      <NewCollaboratorModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it('deve renderizar o título "Novo colaborador"', () => {
    render(<NewCollaboratorModal {...defaultProps} />);
    expect(screen.getByText("Novo colaborador")).toBeInTheDocument();
  });

  it("deve exibir campos obrigatórios: Nome e E-mail", () => {
    render(<NewCollaboratorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("Nome completo")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("colaborador@mail.com"),
    ).toBeInTheDocument();
  });

  it("deve exibir campo Telefone", () => {
    render(<NewCollaboratorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("(21) 98765-4321")).toBeInTheDocument();
  });

  it('deve exibir toggle "Este colaborador é médico(a)"', () => {
    render(<NewCollaboratorModal {...defaultProps} />);
    expect(
      screen.getByText("Este colaborador é médico(a)"),
    ).toBeInTheDocument();
  });

  it("não deve exibir campos de CRM inicialmente (is_doctor=false)", () => {
    render(<NewCollaboratorModal {...defaultProps} />);
    expect(screen.queryByPlaceholderText("123456")).not.toBeInTheDocument();
  });

  it("deve exibir campos de CRM ao ativar toggle de médico", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);

    expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    expect(screen.getByText("UF do CRM")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/ortopedia|cardiologia/i),
    ).toBeInTheDocument();
  });

  it("deve validar e-mail ao sair do campo (onBlur)", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("colaborador@mail.com");
    await userEvent.type(emailInput, "email-invalido");
    fireEvent.blur(emailInput);

    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

  it("deve limpar erro de e-mail ao digitar novamente", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("colaborador@mail.com");
    await userEvent.type(emailInput, "invalido");
    fireEvent.blur(emailInput);
    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "valido@email.com");
    expect(screen.queryByText("E-mail inválido")).not.toBeInTheDocument();
  });

  it("deve aplicar máscara de telefone", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const phoneInput = screen.getByPlaceholderText(
      "(21) 98765-4321",
    ) as HTMLInputElement;
    await userEvent.type(phoneInput, "21987654321");

    expect(phoneInput.value).toBe("(21) 98765-4321");
  });

  it('deve enviar dados ao clicar em "Adicionar colaborador"', async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "new-1",
    });

    render(<NewCollaboratorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Maria Silva",
    );
    await userEvent.type(
      screen.getByPlaceholderText("colaborador@mail.com"),
      "maria@email.com",
    );

    const submitBtn = screen.getByText("Adicionar colaborador");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(collaboratorService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Maria Silva",
          email: "maria@email.com",
          is_doctor: false,
        }),
      );
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("deve exibir erro da API ao falhar", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: "Email já cadastrado" } },
    });

    render(<NewCollaboratorModal {...defaultProps} />);

    await userEvent.type(screen.getByPlaceholderText("Nome completo"), "Maria");
    await userEvent.type(
      screen.getByPlaceholderText("colaborador@mail.com"),
      "maria@email.com",
    );
    await userEvent.click(screen.getByText("Adicionar colaborador"));

    await waitFor(() => {
      expect(screen.getByText("Email já cadastrado")).toBeInTheDocument();
    });
  });

  it("deve desabilitar botão submit quando há erro de e-mail", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("colaborador@mail.com");
    await userEvent.type(emailInput, "invalido");
    fireEvent.blur(emailInput);

    const submitBtn = screen.getByText("Adicionar colaborador");
    expect(submitBtn).toBeDisabled();
  });

  it("deve fechar ao clicar no botão X (aria-label Fechar)", async () => {
    render(<NewCollaboratorModal {...defaultProps} />);

    const closeBtn = screen.getByLabelText("Fechar");
    await userEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("deve enviar dados de médico quando toggle is_doctor ativado", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "new-2",
    });

    render(<NewCollaboratorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. Carlos",
    );
    await userEvent.type(
      screen.getByPlaceholderText("colaborador@mail.com"),
      "carlos@email.com",
    );

    // Ativar toggle de médico
    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);

    // Preencher campos de médico
    await userEvent.type(screen.getByPlaceholderText("123456"), "654321");

    const select = screen.getByDisplayValue("Selecione");
    await userEvent.selectOptions(select, "SP");

    await userEvent.click(screen.getByText("Adicionar colaborador"));

    await waitFor(() => {
      expect(collaboratorService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Dr. Carlos",
          email: "carlos@email.com",
          is_doctor: true,
          crm: "654321",
          crm_state: "SP",
        }),
      );
    });
  });
});
