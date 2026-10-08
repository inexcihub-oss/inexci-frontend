import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateInput } from "../DateInput";

describe("DateInput — associação do label", () => {
  it("liga o label ao input sem id vindo de fora", () => {
    render(<DateInput label="Data de nascimento" value="" onChange={vi.fn()} />);

    const campo = screen.getByRole("textbox", { name: "Data de nascimento" });
    expect(campo.id).not.toBe("");
    expect(screen.getByLabelText("Data de nascimento")).toBe(campo);
  });

  it("respeita o id recebido", () => {
    render(
      <DateInput id="minha-data" label="Data" value="" onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Data")).toHaveAttribute("id", "minha-data");
  });

  it("dois campos na mesma tela não compartilham id", () => {
    render(
      <>
        <DateInput label="Início" value="" onChange={vi.fn()} />
        <DateInput label="Fim" value="" onChange={vi.fn()} />
      </>,
    );

    expect(screen.getByLabelText("Início").id).not.toBe(
      screen.getByLabelText("Fim").id,
    );
  });
});
