import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";
import { Modal } from "@/components/ui/Modal";

const doctors = [
  { id: "d1", name: "Dr. Carlos Mendonça", crm: "1", crmState: "SP" },
  { id: "d2", name: "Dra. Ana Paula", crm: "2", crmState: "RJ" },
];

const muitos = Array.from({ length: 12 }, (_, i) => ({
  id: `m${i}`,
  name: i === 7 ? "Fábio Soares Segall" : `Profissional ${String(i).padStart(2, "0")}`,
  crm: String(i),
  crmState: "RJ",
}));

describe("AgendaDoctorFilter", () => {
  it("não renderiza com apenas um profissional", () => {
    const { container } = render(
      <AgendaDoctorFilter
        doctors={[doctors[0]]}
        selectedDoctorIds={[]}
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("fechado, ocupa um botão só, com o resumo da seleção", () => {
    const { rerender } = render(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={[]} onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Profissionais: Todos os profissionais" }),
    ).toHaveAttribute("aria-expanded", "false");
    // Fechado, o texto curto mantém o botão do tamanho do "Ver agenda".
    expect(screen.getByRole("button", { name: /Profissionais:/ })).toHaveTextContent(
      /^Profissionais$/,
    );
    expect(screen.queryByText("Dra. Ana Paula")).toBeNull();

    rerender(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={["d2"]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Profissionais: Dra. Ana Paula" })).toBeInTheDocument();

    rerender(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={["d1", "d2"]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Profissionais: 2 profissionais" })).toBeInTheDocument();
  });

  it("alterna a seleção na lista, ordenada por quem tem mais consultas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <AgendaDoctorFilter
        doctors={doctors}
        selectedDoctorIds={[]}
        onChange={onChange}
        countByDoctorId={{ d1: 2, d2: 5 }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
    const lista = screen.getByRole("dialog", { name: "Filtrar por profissional" });
    const opcoes = within(lista).getAllByRole("checkbox");
    expect(opcoes.map((o) => o.textContent)).toEqual([
      "Todos os profissionais",
      "Dra. Ana Paula5",
      "Dr. Carlos Mendonça2",
    ]);
    expect(opcoes[0]).toHaveAttribute("aria-checked", "true");

    await user.click(within(lista).getByRole("checkbox", { name: /Dr. Carlos Mendonça/ }));
    expect(onChange).toHaveBeenCalledWith(["d1"]);

    rerender(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={["d1"]} onChange={onChange} />,
    );
    await user.click(screen.getByRole("checkbox", { name: /Dra. Ana Paula/ }));
    expect(onChange).toHaveBeenLastCalledWith(["d1", "d2"]);
    await user.click(screen.getByRole("checkbox", { name: /Dr. Carlos Mendonça/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("Todos e Limpar zeram a seleção", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={["d1"]} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
    await user.click(screen.getByRole("checkbox", { name: "Todos os profissionais" }));
    expect(onChange).toHaveBeenCalledWith([]);
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("com muitos profissionais, busca sem diferenciar acento e caixa", async () => {
    const user = userEvent.setup();
    render(<AgendaDoctorFilter doctors={muitos} selectedDoctorIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));

    await user.type(screen.getByRole("searchbox", { name: "Buscar profissional" }), "fabio");
    const opcoes = screen.getAllByRole("checkbox");
    expect(opcoes.map((o) => o.textContent)).toEqual(["Fábio Soares Segall"]);

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "xyz");
    expect(screen.getByText("Nenhum profissional encontrado.")).toBeInTheDocument();
  });

  it("poucos profissionais não mostram busca; Esc fecha", async () => {
    const user = userEvent.setup();
    render(<AgendaDoctorFilter doctors={doctors} selectedDoctorIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
    expect(screen.queryByRole("searchbox")).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dentro de um Modal, Esc fecha só a lista; o segundo Esc fecha o Modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Exportar agenda">
        <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={[]} onChange={vi.fn()} />
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
    expect(screen.getByRole("dialog", { name: "Filtrar por profissional" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Filtrar por profissional" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opções são checkboxes com aria-checked (não menuitem sem menu)", async () => {
    const user = userEvent.setup();
    render(
      <AgendaDoctorFilter doctors={doctors} selectedDoctorIds={["d2"]} onChange={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
    expect(screen.queryAllByRole("menuitemcheckbox")).toHaveLength(0);
    expect(screen.getByRole("checkbox", { name: /Dra. Ana Paula/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it.each([
    ["start", "800px"],
    ["end", "620px"],
  ] as const)(
    "align=%s posiciona a lista pela borda certa do botão",
    async (align, left) => {
      const user = userEvent.setup();
      // Botão em x=800..920 numa janela de 1440: a lista (300px) cabe dos
      // dois jeitos, então só o alinhamento decide.
      const rect = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockReturnValue({
          top: 100, bottom: 132, left: 800, right: 920, width: 120, height: 32,
          x: 800, y: 100, toJSON: () => ({}),
        } as DOMRect);
      const largura = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
      try {
        render(
          <AgendaDoctorFilter
            doctors={doctors}
            selectedDoctorIds={[]}
            onChange={vi.fn()}
            align={align}
          />,
        );
        await user.click(screen.getByRole("button", { name: /Profissionais:/ }));
        expect(
          screen.getByRole("dialog", { name: "Filtrar por profissional" }).style.left,
        ).toBe(left);
      } finally {
        rect.mockRestore();
        Object.defineProperty(window, "innerWidth", { configurable: true, value: largura });
      }
    },
  );
});
