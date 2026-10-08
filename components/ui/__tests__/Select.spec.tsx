import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Select from "../Select";

const OPCOES = [
  { value: "a", label: "Opção A" },
  { value: "b", label: "Opção B" },
];

describe("Select — associação do label", () => {
  it("liga o label ao select sem id vindo de fora", () => {
    render(<Select label="Conselho" options={OPCOES} />);

    const campo = screen.getByLabelText("Conselho");
    expect(campo.tagName).toBe("SELECT");
    expect(campo.id).not.toBe("");
  });

  it("respeita o id recebido", () => {
    render(<Select id="meu-select" label="Estado" options={OPCOES} />);

    expect(screen.getByLabelText("Estado")).toHaveAttribute("id", "meu-select");
  });

  it("dois selects na mesma tela não compartilham id", () => {
    render(
      <>
        <Select label="Primeiro" options={OPCOES} />
        <Select label="Segundo" options={OPCOES} />
      </>,
    );

    expect(screen.getByLabelText("Primeiro").id).not.toBe(
      screen.getByLabelText("Segundo").id,
    );
  });

  it("label com asterisco de obrigatório continua achando o campo", () => {
    render(<Select label="Gênero" required options={OPCOES} />);

    expect(
      screen.getByRole("combobox", { name: /Gênero/ }),
    ).toBeInTheDocument();
  });
});
