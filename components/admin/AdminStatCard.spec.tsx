import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditCard } from "lucide-react";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatTrendBadge,
} from "./AdminStatCard";

describe("AdminStatCard", () => {
  it("mostra rótulo, valor, explicação, rodapé e selo", () => {
    render(
      <AdminStatCard
        label="Receita recorrente mensal (MRR)"
        value="R$ 10,00"
        hint="Quanto as assinaturas ativas pagam por mês"
        footnote="Comparado ao início do período"
        badge={<AdminStatTrendBadge trend="up">5,0%</AdminStatTrendBadge>}
      />,
    );
    expect(screen.getByText("Receita recorrente mensal (MRR)")).toBeVisible();
    expect(screen.getByText("R$ 10,00")).toBeVisible();
    expect(
      screen.getByText("Quanto as assinaturas ativas pagam por mês"),
    ).toBeVisible();
    expect(screen.getByText("Comparado ao início do período")).toBeVisible();
    expect(screen.getByText("5,0%").parentElement).toHaveTextContent("↑5,0%");
  });

  it("sem ícone, não renderiza imagem nem svg", () => {
    const { container } = render(<AdminStatCard label="Contas" value={3} />);
    expect(container.querySelector("img, svg")).toBeNull();
  });

  it("com ícone e cor, mostra o ícone ao lado do rótulo e tinge o card", () => {
    const { container } = render(
      <AdminStatCard
        label="Contas pagantes"
        value={3}
        icon={CreditCard}
        accent="blue"
      />,
    );
    const chip = container.querySelector("svg")?.parentElement;
    expect(chip).toHaveAttribute("aria-hidden", "true");
    expect(chip).toHaveClass("bg-blue-100", "text-blue-700");
    expect(chip?.nextElementSibling).toHaveTextContent("Contas pagantes");
    expect(container.firstElementChild).toHaveClass(
      "border-blue-100",
      "from-blue-50",
    );
  });

  it("aplica o tom de alerta no valor", () => {
    render(
      <AdminStatCard label="Inadimplência" value="R$ 5,00" tone="danger" />,
    );
    expect(screen.getByText("R$ 5,00")).toHaveClass("text-red-700");
  });

  it("tendência neutra não mostra seta", () => {
    render(<AdminStatTrendBadge trend="neutral">0,0%</AdminStatTrendBadge>);
    expect(screen.getByText("0,0%")).toHaveTextContent(/^0,0%$/);
  });

  it("grade começa em uma coluna e a seção vira região nomeada", () => {
    render(
      <AdminSection title="Receita" description="Valores em reais">
        <AdminStatGrid columns={4}>
          <AdminStatCard label="A" value={1} />
        </AdminStatGrid>
      </AdminSection>,
    );
    const region = screen.getByRole("region", { name: "Receita" });
    expect(region).toHaveTextContent("Valores em reais");
    const grid = region.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "xl:grid-cols-4");
  });
});
