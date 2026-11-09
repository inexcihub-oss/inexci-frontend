import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminStatusBadge } from "./AdminStatusBadge";
import {
  ADMIN_ACCOUNT_SITUATIONS,
  ADMIN_SITUATION_META,
} from "@/lib/admin-account-status";

const base = {
  daysLeft: 4,
  daysOverdue: 2,
  currentPeriodEnd: "2026-11-05T12:00:00.000Z",
};

describe("AdminStatusBadge", () => {
  it.each(ADMIN_ACCOUNT_SITUATIONS)("renderiza a situação %s", (situation) => {
    render(<AdminStatusBadge account={{ ...base, situation }} compact />);
    const selo = screen.getByText(ADMIN_SITUATION_META[situation].label);
    expect(selo).toHaveAttribute("data-situation", situation);
    for (const classe of ADMIN_SITUATION_META[situation].className.split(" ")) {
      expect(selo).toHaveClass(classe);
    }
  });

  it("junta o texto auxiliar ao rótulo", () => {
    render(<AdminStatusBadge account={{ ...base, situation: "trial" }} />);
    expect(screen.getByText("Trial · faltam 4 dias")).toBeInTheDocument();
  });

  it("conta desativada mostra desde quando", () => {
    render(
      <AdminStatusBadge
        account={{
          ...base,
          situation: "deactivated",
          accountDeactivatedAt: "2026-10-20T15:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText("Desativada · desde 20/10")).toBeInTheDocument();
  });

  it("omite o auxiliar no modo compacto", () => {
    render(
      <AdminStatusBadge account={{ ...base, situation: "past_due" }} compact />,
    );
    expect(screen.getByText("Inadimplente")).toBeInTheDocument();
  });
});
