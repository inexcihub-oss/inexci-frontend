import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/tuss.service", () => ({
  tussService: { searchTussFromJson: vi.fn() },
}));

import { tussService } from "@/services/tuss.service";
import { TussCodePicker } from "./TussCodePicker";

const results = [
  {
    id: "1",
    tussCode: "4.09.01.14-0",
    name: "Ressonância magnética de joelho",
    active: true,
  },
  {
    id: "2",
    tussCode: "4.03.01.01-9",
    name: "Hemograma completo",
    active: true,
  },
];

describe("TussCodePicker", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      tussService.searchTussFromJson as ReturnType<typeof vi.fn>
    ).mockResolvedValue(results);
  });

  /**
   * O campo é controlado pelo formulário, então o teste precisa devolver o
   * valor digitado — senão nada acumula e a busca nunca dispara.
   */
  function Harness({ initial = "" }: { initial?: string }) {
    const [value, setValue] = useState(initial);
    return (
      <TussCodePicker
        id="exame-0"
        label="Código TUSS"
        value={value}
        onChange={(selection) => {
          setValue(selection.tussCode);
          onChange(selection);
        }}
      />
    );
  }

  const setup = (value = "") => render(<Harness initial={value} />);

  it("busca no catálogo a partir de duas letras digitadas", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/código tuss/i), "resso");

    await waitFor(() =>
      expect(tussService.searchTussFromJson).toHaveBeenCalledWith("resso", 20),
    );
    expect(
      await screen.findByText(/Ressonância magnética de joelho/i),
    ).toBeDefined();
  });

  // Sem isso o médico precisa adivinhar o que digitar para o catálogo abrir.
  it("já mostra sugestões ao focar o campo, sem digitar nada", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByLabelText(/código tuss/i));

    await waitFor(() =>
      expect(tussService.searchTussFromJson).toHaveBeenCalledWith(
        undefined,
        20,
      ),
    );
    expect(await screen.findByText("Hemograma completo")).toBeDefined();
  });

  it("renderiza a lista fora do campo (portal), para o modal não cortar", async () => {
    const user = userEvent.setup();
    const { container } = setup();

    await user.click(screen.getByLabelText(/código tuss/i));
    const option = await screen.findByText("Hemograma completo");

    // Dentro do container o dropdown seria cortado pelo overflow do modal.
    expect(container.contains(option)).toBe(false);
    expect(document.body.contains(option)).toBe(true);
  });

  it("devolve código e nome ao escolher um procedimento", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/código tuss/i), "hemo");
    await user.click(await screen.findByText(/Hemograma completo/i));

    expect(onChange).toHaveBeenCalledWith({
      tussCode: "4.03.01.01-9",
      name: "Hemograma completo",
    });
  });

  // O catálogo cobre o comum, mas o convênio às vezes exige um código que não
  // está lá — digitar continua valendo.
  it("aceita um código digitado que não veio do catálogo", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/código tuss/i), "9.99.99.99-9");

    expect(onChange).toHaveBeenLastCalledWith({ tussCode: "9.99.99.99-9" });
  });

  it("mostra o código já escolhido", () => {
    setup("4.03.01.01-9");

    expect(
      (screen.getByLabelText(/código tuss/i) as HTMLInputElement).value,
    ).toBe("4.03.01.01-9");
  });

  it("avisa quando o catálogo não tem o termo", async () => {
    const user = userEvent.setup();
    (
      tussService.searchTussFromJson as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    setup();

    await user.type(screen.getByLabelText(/código tuss/i), "xyzw");

    expect(
      await screen.findByText(/nenhum procedimento encontrado/i),
    ).toBeDefined();
  });
});
