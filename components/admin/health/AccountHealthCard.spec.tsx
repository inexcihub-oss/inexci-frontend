import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AccountHealthCard } from "./AccountHealthCard";

const health = {
  score: 52,
  band: "attention" as const,
  mainReason: "Uso caiu 60% em relação à semana anterior",
  computedAt: "2026-10-28T15:00:00Z",
  factors: [
    {
      key: "usage_drop" as const,
      points: 12,
      message: "Uso caiu 60% em relação à semana anterior",
    },
    {
      key: "errors" as const,
      points: 8,
      message: "6 erros da plataforma nos últimos 3 dias",
    },
  ],
};

const history = [
  { day: "2026-10-26", score: 80, band: "healthy" as const },
  { day: "2026-10-27", score: 60, band: "attention" as const },
  { day: "2026-10-28", score: 52, band: "attention" as const },
];

describe("AccountHealthCard", () => {
  it("mostra nota, faixa, quando foi calculada e cada fator com os pontos perdidos", () => {
    render(<AccountHealthCard health={health} history={history} />);

    const card = screen.getByRole("region", { name: "Saúde da conta" });
    expect(card).toHaveTextContent("52");
    expect(within(card).getByText("Atenção", { selector: "span" })).toHaveClass(
      "text-amber-800",
    );
    expect(card).toHaveTextContent("Calculada em 28/10/2026, 12:00");
    const fatores = within(card).getAllByRole("listitem");
    expect(fatores[0]).toHaveTextContent(
      "Uso caiu 60% em relação à semana anterior−12",
    );
    expect(fatores[1]).toHaveTextContent(
      "6 erros da plataforma nos últimos 3 dias−8",
    );
  });

  it("expõe a evolução de 30 dias em tabela acessível", () => {
    render(<AccountHealthCard health={health} history={history} />);

    const table = screen.getByRole("table", { name: "Nota de saúde por dia" });
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("26/1080Saudável");
    expect(rows[3]).toHaveTextContent("28/1052Atenção");
  });

  it("sem fatores, diz que não há ponto de atenção", () => {
    render(
      <AccountHealthCard
        health={{ ...health, score: 100, band: "healthy", factors: [] }}
        history={[]}
      />,
    );
    expect(screen.getByText("Nenhum ponto de atenção")).toBeInTheDocument();
  });

  it("conta sem nota explica o motivo e não mostra fatores", () => {
    render(<AccountHealthCard health={null} history={[]} />);
    expect(
      screen.getByText(
        "Sem nota: conta cancelada, desativada ou ainda não avaliada",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
