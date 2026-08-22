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

  /**
   * O médico agenda a própria consulta, marca a consulta como realizada e
   * agenda o retorno a partir da ficha do paciente — sem Agenda ele não
   * conseguiria atender. E finalizar uma ficha com indicação cirúrgica abre
   * a SC: sem Atendimento/Solicitações, a solicitação ficaria invisível
   * para o próprio médico. Ver `resolveEffectivePermissions` no backend.
   */
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

  /**
   * O texto diz "excluir cadastros", não "cadastros": criar e editar hospital,
   * convênio, fornecedor e fabricante são transversais a qualquer área — só a
   * exclusão ficou em Administração. Prometer o cadastro inteiro aqui faria o
   * admin conceder a área por um motivo que não existe mais.
   */
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

  /**
   * Âncora do tour de onboarding (`lib/onboarding/tour-registry.ts`, trilha
   * `administracao`, passo `areas`). Sem este teste, mover ou remover o
   * atributo do elemento raiz quebra o tour em silêncio.
   */
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
});
