import { describe, it, expect } from "vitest";
import {
  ADMIN_ACCOUNT_SITUATIONS,
  ADMIN_SITUATION_META,
  describeSituation,
} from "./admin-account-status";

describe("admin-account-status", () => {
  it("mapeia as nove situações para rótulo e classes", () => {
    expect(ADMIN_ACCOUNT_SITUATIONS).toHaveLength(9);
    expect(ADMIN_SITUATION_META.trial.label).toBe("Trial");
    expect(ADMIN_SITUATION_META.trial_expired.label).toBe("Trial vencido");
    expect(ADMIN_SITUATION_META.active.label).toBe("Ativa");
    expect(ADMIN_SITUATION_META.cancel_scheduled.label).toBe(
      "Cancelamento agendado",
    );
    expect(ADMIN_SITUATION_META.past_due.label).toBe("Inadimplente");
    expect(ADMIN_SITUATION_META.suspended.label).toBe("Suspensa");
    expect(ADMIN_SITUATION_META.canceled.label).toBe("Cancelada");
    expect(ADMIN_SITUATION_META.internal.label).toBe("Acesso interno");
    expect(ADMIN_SITUATION_META.internal.className).toContain("violet");
    expect(ADMIN_SITUATION_META.deactivated.label).toBe("Desativada");
    expect(ADMIN_SITUATION_META.trial.className).toContain("#FFF7D7");
  });

  const base = {
    daysLeft: null,
    daysOverdue: null,
    currentPeriodEnd: "2026-11-05T12:00:00.000Z",
  };

  it("monta o texto auxiliar de cada situação", () => {
    expect(
      describeSituation({ ...base, situation: "trial", daysLeft: 4 }),
    ).toBe("faltam 4 dias");
    expect(
      describeSituation({ ...base, situation: "trial", daysLeft: 1 }),
    ).toBe("falta 1 dia");
    expect(
      describeSituation({
        ...base,
        situation: "trial_expired",
        daysOverdue: 3,
      }),
    ).toBe("venceu há 3 dias");
    expect(describeSituation({ ...base, situation: "active" })).toBe(
      "próxima cobrança 05/11",
    );
    expect(describeSituation({ ...base, situation: "cancel_scheduled" })).toBe(
      "encerra em 05/11",
    );
    expect(
      describeSituation({ ...base, situation: "past_due", daysLeft: 5 }),
    ).toBe("suspende em 5 dias");
    expect(describeSituation({ ...base, situation: "internal" })).toBeNull();
    expect(describeSituation({ ...base, situation: "canceled" })).toBeNull();
  });
});
