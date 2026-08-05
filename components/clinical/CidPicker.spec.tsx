import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/cid.service", () => ({
  cidService: { search: vi.fn() },
}));

import { cidService } from "@/services/cid.service";
import { CidPicker } from "./CidPicker";
import { ClinicalCidCode } from "@/services/clinical-record.service";

const records = [
  { code: "M54.5", description: "Dor lombar baixa" },
  { code: "M23.3", description: "Outros transtornos do menisco" },
];

describe("CidPicker", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (cidService.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      records,
    });
  });

  function Harness({ initial = [] as ClinicalCidCode[] }) {
    const [value, setValue] = useState<ClinicalCidCode[]>(initial);
    return (
      <CidPicker
        value={value}
        onChange={(codes) => {
          setValue(codes);
          onChange(codes);
        }}
      />
    );
  }

  const setup = (initial: ClinicalCidCode[] = []) =>
    render(<Harness initial={initial} />);

  // Sem isto o campo parece vazio até o médico adivinhar um termo que retorne
  // algo.
  it("já mostra sugestões ao focar o campo, sem digitar nada", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByPlaceholderText(/buscar cid/i));

    await waitFor(() => expect(cidService.search).toHaveBeenCalled());
    expect(await screen.findByText(/Dor lombar baixa/i)).toBeDefined();
  });

  it("renderiza a lista fora do campo (portal), para o modal não cortar", async () => {
    const user = userEvent.setup();
    const { container } = setup();

    await user.click(screen.getByPlaceholderText(/buscar cid/i));
    const option = await screen.findByText(/Dor lombar baixa/i);

    expect(container.contains(option)).toBe(false);
    expect(document.body.contains(option)).toBe(true);
  });

  it("adiciona o CID escolhido na lista", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByPlaceholderText(/buscar cid/i));
    await user.click(await screen.findByText(/Dor lombar baixa/i));

    expect(onChange).toHaveBeenCalledWith([
      { code: "M54.5", description: "Dor lombar baixa" },
    ]);
  });

  it("busca pelo termo digitado", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar cid/i), "lombar");

    await waitFor(() =>
      expect(cidService.search).toHaveBeenCalledWith("lombar", 20),
    );
  });

  it("não repete um CID já escolhido", async () => {
    const user = userEvent.setup();
    setup([{ code: "M54.5", description: "Dor lombar baixa" }]);

    await user.click(screen.getByPlaceholderText(/buscar cid/i));
    await user.click(await screen.findByText(/Outros transtornos do menisco/i));

    expect(onChange).toHaveBeenCalledWith([
      { code: "M54.5", description: "Dor lombar baixa" },
      { code: "M23.3", description: "Outros transtornos do menisco" },
    ]);
  });
});
