import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SelectSearch from "../SelectSearch";

describe("SelectSearch — acessibilidade", () => {
  it("é um combobox nomeado pelo ariaLabel, aberto pelo teclado", async () => {
    const user = userEvent.setup();
    render(
      <SelectSearch
        value=""
        onChange={vi.fn()}
        onSearch={vi.fn().mockResolvedValue([])}
        ariaLabel="Paciente"
        placeholder="Buscar..."
      />,
    );

    const combo = screen.getByRole("combobox", { name: "Paciente" });
    expect(combo).toHaveAttribute("aria-expanded", "false");

    combo.focus();
    await user.keyboard("{Enter}");

    expect(combo).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("textbox", { name: "Paciente" }),
    ).toBeInTheDocument();
  });

  it("usa o label visível como nome quando não há ariaLabel", () => {
    render(
      <SelectSearch
        value=""
        onChange={vi.fn()}
        onSearch={vi.fn().mockResolvedValue([])}
        label="Hospital"
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Hospital" }),
    ).toBeInTheDocument();
  });

  it("desabilitado não entra na ordem de tabulação", () => {
    render(
      <SelectSearch
        value=""
        onChange={vi.fn()}
        onSearch={vi.fn().mockResolvedValue([])}
        ariaLabel="Paciente"
        disabled
      />,
    );
    expect(screen.getByRole("combobox", { name: "Paciente" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
