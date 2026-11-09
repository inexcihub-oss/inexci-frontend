import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AiUsageTable } from "./AiUsageTable";

function mockMobile() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

function clearMobile() {
  delete (window as { matchMedia?: unknown }).matchMedia;
}

const row = (over: Record<string, unknown>) => ({
  groupKey: "x",
  name: null,
  email: null,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 1000,
  totalCalls: 10,
  totalRecords: 4,
  costUsdCents: 200,
  avgLatencyMs: 100,
  ...over,
});

const common = {
  isLoading: false,
  isError: false,
  recordsPlural: "Mensagens",
  recordsSingular: "mensagem",
};

describe("AiUsageTable", () => {
  it("uso sem conta aparece como Sem conta, sem link", () => {
    render(
      <AiUsageTable
        {...common}
        kind="owner"
        rows={[
          row({ groupKey: "none" }),
          row({ groupKey: "o-1", name: "Clínica Ortho" }),
        ]}
      />,
    );
    expect(screen.getByText("Sem conta")).toBeInTheDocument();
    expect(screen.queryByText("none")).toBeNull();
    expect(screen.getByRole("link", { name: "Clínica Ortho" })).toHaveAttribute(
      "href",
      "/admin/clientes/o-1",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("uso sem usuário aparece como Sem usuário", () => {
    render(
      <AiUsageTable
        {...common}
        kind="user"
        rows={[
          row({ groupKey: "anonymous" }),
          row({ groupKey: "u-1", name: "Dra. Ana", email: "ana@x.com" }),
        ]}
      />,
    );
    expect(screen.getByText("Sem usuário")).toBeInTheDocument();
    expect(screen.queryByText("anonymous")).toBeNull();
    expect(screen.getByText("Dra. Ana")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("no celular vira cards com o custo em destaque", () => {
    mockMobile();
    try {
      render(
        <AiUsageTable
          {...common}
          kind="owner"
          rows={[row({ groupKey: "o-1", name: "Clínica Ortho" })]}
          previous={new Map([["o-1", 100]])}
        />,
      );
      expect(screen.queryByRole("table")).toBeNull();
      const card = screen
        .getByRole("link", { name: "Clínica Ortho" })
        .closest("li")!;
      expect(within(card).getByText("Tokens")).toBeInTheDocument();
      expect(within(card).getByText("Médio por mensagem")).toBeInTheDocument();
      expect(
        within(card).getByText("vs. período anterior"),
      ).toBeInTheDocument();
      expect(card).toHaveTextContent("1.000");
    } finally {
      clearMobile();
    }
  });
});
