import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityComboboxDeferredCreate } from "../EntityComboboxDeferredCreate";

const HOSPITAIS = [
  { id: "h1", name: "Hospital Caxias D' or" },
  { id: "h2", name: "Hospital São Lucas" },
];

/**
 * Espelha o uso real: o combobox vive dentro de um <form> com botão de submit,
 * e começa com um hospital já preenchido (vindo da extração do documento).
 */
function Harness({
  onSubmit,
  initialId = "h1",
  initialName = "Hospital Caxias D' or",
}: {
  onSubmit?: () => void;
  initialId?: string;
  initialName?: string;
}) {
  const [id, setId] = useState(initialId);
  const [name, setName] = useState(initialName);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <EntityComboboxDeferredCreate
        value={id}
        query={name}
        options={HOSPITAIS}
        placeholder="Buscar ou criar hospital..."
        emptyText="Nenhum hospital encontrado"
        createLabel="hospital"
        onSelect={setId}
        onQueryChange={setName}
      />
      <output data-testid="estado">{`${id}|${name}`}</output>
      <button type="submit">Salvar</button>
    </form>
  );
}

describe("EntityComboboxDeferredCreate", () => {
  it("aceita o nome digitado ao clicar na linha de criação", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.clear(input);
    await user.type(input, "Hospital Caxias D'");

    await user.click(
      screen.getByRole("button", { name: /será criado como hospital/i }),
    );

    expect(screen.getByTestId("estado")).toHaveTextContent(
      "|Hospital Caxias D'",
    );
    expect(
      screen.getByText(/Novo hospital: .*Hospital Caxias D'/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /será criado como hospital/i }),
    ).not.toBeInTheDocument();
  });

  it("aceita o nome digitado com Enter, sem submeter o formulário", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.clear(input);
    await user.type(input, "Hospital Novo{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("estado")).toHaveTextContent("|Hospital Novo");
    expect(screen.getByText(/Novo hospital/)).toBeInTheDocument();
  });

  it("Enter seleciona o item destacado pelas setas em vez de criar", async () => {
    const user = userEvent.setup();
    render(<Harness initialId="" initialName="" />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.type(input, "Hospital");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(screen.getByTestId("estado")).toHaveTextContent(
      "h2|Hospital São Lucas",
    );
  });

  it("Enter em nome que já existe seleciona o registro existente", async () => {
    const user = userEvent.setup();
    render(<Harness initialId="" initialName="" />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.type(input, "hospital são lucas{Enter}");

    expect(screen.getByTestId("estado")).toHaveTextContent(
      "h2|Hospital São Lucas",
    );
    expect(screen.queryByText(/Novo hospital/)).not.toBeInTheDocument();
  });

  it("editar um hospital já preenchido limpa o id e mantém o texto digitado", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.clear(input);
    await user.type(input, "Hospital Caxias D'");
    await user.keyboard("{Escape}");

    expect(screen.getByTestId("estado")).toHaveTextContent(
      "|Hospital Caxias D'",
    );
    expect(screen.getByText(/Novo hospital/)).toBeInTheDocument();
  });

  it("clicar em uma opção existente preenche o id", async () => {
    const user = userEvent.setup();
    render(<Harness initialId="" initialName="" />);

    const input = screen.getByPlaceholderText("Buscar ou criar hospital...");
    await user.click(input);
    await user.click(screen.getByRole("button", { name: "Hospital São Lucas" }));

    expect(screen.getByTestId("estado")).toHaveTextContent(
      "h2|Hospital São Lucas",
    );
  });
});
