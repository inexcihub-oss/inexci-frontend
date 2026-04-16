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
        }),
      );
    });

    // Não deve enviar is_doctor no payload (campo gerenciado pelo backend)
    const callArgs = (collaboratorService.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("is_doctor");

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

  it("deve enviar doctor_profile quando toggle de médico ativado", async () => {
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
          doctor_profile: expect.objectContaining({
            crm: "654321",
            crm_state: "SP",
          }),
        }),
      );
    });

    // Não deve enviar is_doctor no payload (campo gerenciado pelo backend)
    const callArgs = (collaboratorService.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("is_doctor");
  });
});

/**
 * TASK-FE-Q01: Testes para a prop defaultIsDoctor
 * Garante que o NewCollaboratorModal funciona como substituto do NewDoctorModal.
 */
describe("NewCollaboratorModal — defaultIsDoctor", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir título "Novo médico" quando defaultIsDoctor=true', () => {
    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);
    expect(screen.getByText("Novo médico")).toBeInTheDocument();
    expect(screen.queryByText("Novo colaborador")).not.toBeInTheDocument();
  });

  it("deve mostrar campos de CRM inicialmente quando defaultIsDoctor=true", () => {
    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);
    expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
  });

  it("deve ter toggle pré-ativado quando defaultIsDoctor=true", () => {
    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it('deve exibir botão "Adicionar médico" quando defaultIsDoctor=true', () => {
    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);
    expect(screen.getByText("Adicionar médico")).toBeInTheDocument();
    expect(screen.queryByText("Adicionar colaborador")).not.toBeInTheDocument();
  });

  it("deve enviar doctor_profile ao submeter com defaultIsDoctor=true", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "doc-1",
    });

    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. João Silva",
    );
    await userEvent.type(
      screen.getByPlaceholderText("colaborador@mail.com"),
      "joao@email.com",
    );
    await userEvent.type(screen.getByPlaceholderText("123456"), "999888");

    const select = screen.getByDisplayValue("Selecione");
    await userEvent.selectOptions(select, "RJ");

    await userEvent.click(screen.getByText("Adicionar médico"));

    await waitFor(() => {
      expect(collaboratorService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Dr. João Silva",
          email: "joao@email.com",
          doctor_profile: expect.objectContaining({
            crm: "999888",
            crm_state: "RJ",
          }),
        }),
      );
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("deve exibir mensagem de erro de médico ao falhar com defaultIsDoctor=true", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    render(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. Teste",
    );
    await userEvent.type(
      screen.getByPlaceholderText("colaborador@mail.com"),
      "teste@email.com",
    );

    // Preencher campos obrigatórios de médico
    await userEvent.type(screen.getByPlaceholderText("123456"), "111222");
    const select = screen.getByDisplayValue("Selecione");
    await userEvent.selectOptions(select, "SP");

    await userEvent.click(screen.getByText("Adicionar médico"));

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao criar médico. Tente novamente."),
      ).toBeInTheDocument();
    });
  });

  it("deve manter is_doctor ativo após fechar e reabrir com defaultIsDoctor=true", async () => {
    const { rerender } = render(
      <NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />,
    );

    // Fechar
    await userEvent.click(screen.getByLabelText("Fechar"));
    expect(defaultProps.onClose).toHaveBeenCalled();

    // Reabrir
    rerender(<NewCollaboratorModal {...defaultProps} defaultIsDoctor={true} />);

    // Toggle deve estar ativado novamente
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
