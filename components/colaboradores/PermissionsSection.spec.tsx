import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Permission } from "@/lib/permissions";
import { PermissionsSection } from "./PermissionsSection";

describe("PermissionsSection", () => {
  it("marca as caixas do valor recebido", () => {
    render(
      <PermissionsSection
        value={[Permission.AGENDA]}
        isDoctor={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /Agenda/i })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Atendimento/i }),
    ).not.toBeChecked();
  });

  it("aplica o preset ao escolher um perfil", () => {
    const onChange = vi.fn();
    render(
      <PermissionsSection value={[]} isDoctor={false} onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText(/Perfil/i), {
      target: { value: "cirurgia" },
    });

    expect(onChange).toHaveBeenCalledWith([
      Permission.AGENDA,
      Permission.SOLICITACOES,
    ]);
  });

  it("trava agenda, atendimento e solicitações quando é médico", () => {
    render(<PermissionsSection value={[]} isDoctor onChange={vi.fn()} />);

    const agenda = screen.getByRole("checkbox", { name: /Agenda/i });
    const atendimento = screen.getByRole("checkbox", { name: /Atendimento/i });
    const solicitacoes = screen.getByRole("checkbox", {
      name: /Solicitações/i,
    });

    expect(agenda).toBeChecked();
    expect(agenda).toBeDisabled();
    expect(atendimento).toBeChecked();
    expect(atendimento).toBeDisabled();
    expect(solicitacoes).toBeChecked();
    expect(solicitacoes).toBeDisabled();
    expect(
      screen.getByText(/médico sempre tem acesso/i),
    ).toBeInTheDocument();
  });

  it("marca com o selo 'Fixa' as três áreas travadas do médico", () => {
    render(<PermissionsSection value={[]} isDoctor onChange={vi.fn()} />);

    expect(screen.getAllByText("Fixa")).toHaveLength(3);
  });

  it("não mostra selo de área fixa para quem não é médico", () => {
    render(
      <PermissionsSection value={[]} isDoctor={false} onChange={vi.fn()} />,
    );

    expect(screen.queryByText("Fixa")).not.toBeInTheDocument();
  });

  it("deixa administração livre para o médico", () => {
    render(<PermissionsSection value={[]} isDoctor onChange={vi.fn()} />);

    expect(
      screen.getByRole("checkbox", { name: /Administração/i }),
    ).toBeEnabled();
  });

  it("avisa o que a administração concede", () => {
    render(
      <PermissionsSection value={[]} isDoctor={false} onChange={vi.fn()} />,
    );

    expect(
      screen.getByText(/Gerenciar colaboradores, excluir cadastros/i),
    ).toBeInTheDocument();
  });

  it("alterna uma caixa sem mexer nas outras", () => {
    const onChange = vi.fn();
    render(
      <PermissionsSection
        value={[Permission.AGENDA]}
        isDoctor={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Administração/i }));

    expect(onChange).toHaveBeenCalledWith([
      Permission.AGENDA,
      Permission.ADMINISTRACAO,
    ]);
  });

  it("oferece a área Financeiro, livre também para o médico", () => {
    render(
      <PermissionsSection
        value={[]}
        isDoctor
        podeAlterarFinanceiro
        onChange={vi.fn()}
      />,
    );

    const financeiro = screen.getByRole("checkbox", { name: /Financeiro/i });
    expect(financeiro).toBeEnabled();
    expect(financeiro).not.toBeChecked();
  });

  it("libera a área Financeiro na ordem das áreas", () => {
    const onChange = vi.fn();
    render(
      <PermissionsSection
        value={[Permission.AGENDA, Permission.ADMINISTRACAO]}
        isDoctor={false}
        podeAlterarFinanceiro
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Financeiro/i }));

    expect(onChange).toHaveBeenCalledWith([
      Permission.AGENDA,
      Permission.FINANCEIRO,
      Permission.ADMINISTRACAO,
    ]);
  });

  it("mantém financeiro e administração ao aplicar um perfil", () => {
    const onChange = vi.fn();
    render(
      <PermissionsSection
        value={[Permission.FINANCEIRO, Permission.ADMINISTRACAO]}
        isDoctor={false}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Perfil/i), {
      target: { value: "atendimento" },
    });

    expect(onChange).toHaveBeenCalledWith([
      Permission.AGENDA,
      Permission.ATENDIMENTO,
      Permission.FINANCEIRO,
      Permission.ADMINISTRACAO,
    ]);
  });

  it('expõe data-tour="admin-areas" no elemento raiz', () => {
    const { container } = render(
      <PermissionsSection value={[]} isDoctor={false} onChange={vi.fn()} />,
    );

    expect(
      container.querySelector('[data-tour="admin-areas"]'),
    ).not.toBeNull();
  });

  it("não deixa desmarcar uma caixa travada quando é médico", () => {
    const onChange = vi.fn();
    render(<PermissionsSection value={[]} isDoctor onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Agenda/i }));

    expect(onChange).not.toHaveBeenCalled();
  });
  describe("profissional que não é médico (MIG-02)", () => {
    it("trava agenda e atendimento, mas deixa solicitações livre", () => {
      render(
        <PermissionsSection
          value={[]}
          isDoctor
          isPhysician={false}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByRole("checkbox", { name: /Agenda/i })).toBeDisabled();
      expect(
        screen.getByRole("checkbox", { name: /Atendimento/i }),
      ).toBeDisabled();
      const solicitacoes = screen.getByRole("checkbox", {
        name: /Solicitações/i,
      });
      expect(solicitacoes).not.toBeDisabled();
      expect(solicitacoes).not.toBeChecked();
    });

    it("explica que solicitações são do médico", () => {
      render(
        <PermissionsSection
          value={[]}
          isDoctor
          isPhysician={false}
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/Solicitações cirúrgicas são do médico/i),
      ).toBeInTheDocument();
    });
  });

  describe("área Financeiro só pelo dono da conta", () => {
    it("trava o Financeiro com a dica para quem não é o dono", () => {
      const onChange = vi.fn();
      render(
        <PermissionsSection
          value={[Permission.FINANCEIRO]}
          isDoctor={false}
          onChange={onChange}
        />,
      );

      const financeiro = screen.getByRole("checkbox", { name: /Financeiro/i });
      expect(financeiro).toBeDisabled();
      expect(financeiro).toBeChecked();
      expect(
        screen.getByText("Só o dono da conta concede ou retira a área Financeiro"),
      ).toBeInTheDocument();
      fireEvent.click(financeiro);
      expect(onChange).not.toHaveBeenCalled();
      expect(
        screen.getByRole("checkbox", { name: /Administração/i }),
      ).toBeEnabled();
    });

    it("o dono altera o Financeiro sem a dica", () => {
      render(
        <PermissionsSection
          value={[]}
          isDoctor={false}
          podeAlterarFinanceiro
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("checkbox", { name: /Financeiro/i }),
      ).toBeEnabled();
      expect(
        screen.queryByText(
          "Só o dono da conta concede ou retira a área Financeiro",
        ),
      ).not.toBeInTheDocument();
    });
  });

  it("somente leitura trava todas as áreas e o perfil", () => {
    const onChange = vi.fn();
    render(
      <PermissionsSection
        value={[Permission.AGENDA]}
        isDoctor={false}
        podeAlterarFinanceiro
        somenteLeitura
        onChange={onChange}
      />,
    );

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    expect(screen.getByLabelText(/Perfil/i)).toBeDisabled();
    expect(
      screen.getByText(/não pode alterar as suas próprias permissões/i),
    ).toBeInTheDocument();
  });
});
