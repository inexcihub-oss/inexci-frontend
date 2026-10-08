import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotaUsageCard } from "./QuotaUsageCard";
import type { QuotaSnapshot } from "@/types";

const base: QuotaSnapshot = {
  used: 20,
  limit: 30,
  isUnlimited: false,
  remaining: 10,
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T00:00:00.000Z",
};

describe("QuotaUsageCard", () => {
  it("plural correto das restantes", () => {
    render(<QuotaUsageCard quota={base} />);
    expect(screen.getByText("10 solicitações restantes")).toBeInTheDocument();
    expect(screen.queryByText(/solicitaçãoões/)).not.toBeInTheDocument();
  });

  it("singular com uma restante", () => {
    render(
      <QuotaUsageCard
        quota={{ ...base, used: 29, remaining: 1 } as QuotaSnapshot}
      />,
    );
    expect(screen.getByText("1 solicitação restante")).toBeInTheDocument();
  });
});
