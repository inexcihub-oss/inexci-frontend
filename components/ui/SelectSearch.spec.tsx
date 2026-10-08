import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectSearch } from "./SelectSearch";

const retangulo = (top: number) =>
  ({
    top,
    bottom: top + 40,
    left: 100,
    right: 500,
    width: 400,
    height: 40,
    x: 100,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe("SelectSearch", () => {
  afterEach(() => vi.restoreAllMocks());

  const renderBusca = (onChange = vi.fn()) =>
    render(
      <SelectSearch
        value=""
        onChange={onChange}
        onSearch={async () => [{ value: "p-1", label: "Ana Beatriz" }]}
        placeholder="Buscar paciente pelo nome..."
      />,
    );

  // Dentro de um modal, o corpo rola com a lista aberta: ela precisa
  // acompanhar o campo, não ficar onde o campo estava ao abrir.
  it("a lista acompanha o campo quando o corpo do modal rola", async () => {
    const user = userEvent.setup();
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(retangulo(300));
    renderBusca();

    await user.click(screen.getByText("Buscar paciente pelo nome..."));
    const lista = await screen.findByText("Ana Beatriz");
    const caixa = lista.parentElement as HTMLElement;
    expect(caixa.style.top).toBe("340px");

    rect.mockReturnValue(retangulo(120));
    act(() => {
      fireEvent.scroll(document.body);
    });
    expect(caixa.style.top).toBe("160px");
  });

  it("escolhe a opção e fecha; clique fora também fecha", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBusca(onChange);

    await user.click(screen.getByText("Buscar paciente pelo nome..."));
    await user.click(await screen.findByText("Ana Beatriz"));
    expect(onChange).toHaveBeenCalledWith("p-1", "Ana Beatriz");
    expect(screen.queryByText("Ana Beatriz", { selector: "div" })).toBeNull();

    await user.click(screen.getByText("Ana Beatriz"));
    expect(await screen.findAllByText("Ana Beatriz")).not.toHaveLength(0);
    await user.click(document.body);
    expect(
      screen.queryByText("Digite pelo menos 2 caracteres para buscar"),
    ).toBeNull();
  });
});
