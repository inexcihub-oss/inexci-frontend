import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AdminDataTable, type AdminColumn } from "./AdminDataTable";
import { AdminFilterField, AdminFilters } from "./AdminFilters";

type Row = { id: string; name: string; email: string; plan: string };

const rows: Row[] = [
  { id: "1", name: "Clínica A", email: "a@a.com", plan: "Starter" },
];

const columns: AdminColumn<Row>[] = [
  { key: "name", header: "Conta", mobile: "title", cell: (r) => r.name },
  { key: "email", header: "E-mail", mobile: "subtitle", cell: (r) => r.email },
  { key: "plan", header: "Plano", cell: (r) => r.plan },
];

function mockMobile(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: matches && query === "(max-width: 639px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminDataTable", () => {
  it("no desktop renderiza tabela com linha clicável", () => {
    const onRowClick = vi.fn();
    render(
      <AdminDataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        rowLabel={(r) => `Abrir ${r.name}`}
        onRowClick={onRowClick}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Plano" })).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Abrir Clínica A" }));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("no mobile vira cards com título, subtítulo e campos rotulados", () => {
    mockMobile(true);
    const onRowClick = vi.fn();
    render(
      <AdminDataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        rowLabel={(r) => `Abrir ${r.name}`}
        onRowClick={onRowClick}
      />,
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const card = screen.getByRole("link", { name: "Abrir Clínica A" });
    expect(card.tagName).toBe("LI");
    expect(card).toHaveTextContent("a@a.com");
    expect(within(card).getByText("Plano").tagName).toBe("DT");
    expect(within(card).getByText("Starter").tagName).toBe("DD");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});

describe("AdminFilters", () => {
  const filtros = (
    <AdminFilters activeCount={1} onClear={vi.fn()}>
      <AdminFilterField label="Plano">
        <select aria-label="Plano">
          <option>Todos</option>
        </select>
      </AdminFilterField>
    </AdminFilters>
  );

  it("no desktop mostra os campos direto na barra", () => {
    render(filtros);
    expect(screen.getByRole("combobox", { name: "Plano" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Filtros/ }),
    ).not.toBeInTheDocument();
  });

  it("no mobile esconde os campos atrás do botão Filtros com contador", () => {
    mockMobile(true);
    render(filtros);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const botao = screen.getByRole("button", { name: /Filtros/ });
    expect(botao).toHaveTextContent("1");
    fireEvent.click(botao);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Plano")).toBeVisible();
    expect(
      within(dialog).getByRole("combobox", { name: "Plano" }),
    ).toBeVisible();
  });
});
