import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinanceStatusBadge } from "./FinanceStatusBadge";
import { ReceivableStatus } from "@/types/finance.types";

describe("FinanceStatusBadge", () => {
  it.each([
    [ReceivableStatus.OPEN, "Em aberto"],
    [ReceivableStatus.PARTIAL, "Parcial"],
    [ReceivableStatus.PAID, "Pago"],
    [ReceivableStatus.CANCELLED, "Cancelada"],
  ])("mostra o rótulo de %s", (status, rotulo) => {
    render(<FinanceStatusBadge status={status} />);
    expect(screen.getByTestId("finance-status-badge")).toHaveTextContent(rotulo);
  });

  it("cancelada usa vermelho, não cinza", () => {
    render(<FinanceStatusBadge status={ReceivableStatus.CANCELLED} />);
    expect(screen.getByTestId("finance-status-badge")).toHaveClass(
      "bg-red-50",
      "text-red-700",
      "border-red-200",
    );
  });
});
