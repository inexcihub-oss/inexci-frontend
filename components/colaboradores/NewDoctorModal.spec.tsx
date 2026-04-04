import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewDoctorModal } from "./NewDoctorModal";

// Mock do collaboratorService
vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    create: vi.fn(),
  },
}));

// Mock do api (importado mas não usado diretamente no modal)
vi.mock("@/lib/api", () => ({
  default: {
    put: vi.fn(),
  },
}));

import { collaboratorService } from "@/services/collaborator.service";

/**
 * PRD: Reformulação Usuários/Permissões — US-004 (adicionar médico)
 * Testa o modal de criação de médico.
 */
describe("NewDoctorModal", () => {
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
      <NewDoctorModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it('deve renderizar o título "Novo médico"', () => {
    render(<NewDoctorModal {...defaultProps} />);
    expect(screen.getByText("Novo médico")).toBeInTheDocument();
  });

  it("deve exibir campos: Nome, Telefone, E-mail, Especialidade, CRM, Estado do CRM", () => {
    render(<NewDoctorModal {...defaultProps} />);

    expect(screen.getByPlaceholderText("Nome completo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(21) 98765-4321")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("medico@mail.com")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/ortopedia|cardiologia/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    expect(screen.getByText("Estado do CRM")).toBeInTheDocument();
  });

  it("deve validar e-mail ao sair do campo", async () => {
    render(<NewDoctorModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("medico@mail.com");
    await userEvent.type(emailInput, "invalido");
    fireEvent.blur(emailInput);

    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

  it("deve aplicar máscara de telefone", async () => {
    render(<NewDoctorModal {...defaultProps} />);

    const phoneInput = screen.getByPlaceholderText(
      "(21) 98765-4321",
    ) as HTMLInputElement;
    await userEvent.type(phoneInput, "11999887766");

    expect(phoneInput.value).toBe("(11) 99988-7766");
  });

  it("deve enviar dados com is_doctor=true ao submeter", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "doc-1",
    });

    render(<NewDoctorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. João Silva",
    );
    await userEvent.type(
      screen.getByPlaceholderText("medico@mail.com"),
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
          is_doctor: true,
          crm: "999888",
          crm_state: "RJ",
        }),
      );
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("deve exibir mensagem de erro da API", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: "Limite de médicos do plano atingido" } },
    });

    render(<NewDoctorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. Teste",
    );
    await userEvent.type(
      screen.getByPlaceholderText("medico@mail.com"),
      "teste@email.com",
    );

    await userEvent.click(screen.getByText("Adicionar médico"));

    await waitFor(() => {
      expect(
        screen.getByText("Limite de médicos do plano atingido"),
      ).toBeInTheDocument();
    });
  });

  it("deve exibir mensagem padrão de erro quando API não retorna mensagem", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    render(<NewDoctorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. Teste",
    );
    await userEvent.type(
      screen.getByPlaceholderText("medico@mail.com"),
      "teste@email.com",
    );

    await userEvent.click(screen.getByText("Adicionar médico"));

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao criar médico. Tente novamente."),
      ).toBeInTheDocument();
    });
  });

  it("deve tratar array de mensagens de erro da API", async () => {
    (collaboratorService.create as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: ["CRM é obrigatório", "UF inválida"] } },
    });

    render(<NewDoctorModal {...defaultProps} />);

    await userEvent.type(
      screen.getByPlaceholderText("Nome completo"),
      "Dr. Teste",
    );
    await userEvent.type(
      screen.getByPlaceholderText("medico@mail.com"),
      "teste@email.com",
    );

    await userEvent.click(screen.getByText("Adicionar médico"));

    await waitFor(() => {
      expect(
        screen.getByText("CRM é obrigatório, UF inválida"),
      ).toBeInTheDocument();
    });
  });

  it("deve fechar ao clicar no X", async () => {
    render(<NewDoctorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Fechar"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("deve desabilitar botão submit quando há erro de e-mail", async () => {
    render(<NewDoctorModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("medico@mail.com");
    await userEvent.type(emailInput, "invalido");
    fireEvent.blur(emailInput);

    expect(screen.getByText("Adicionar médico")).toBeDisabled();
  });
});
