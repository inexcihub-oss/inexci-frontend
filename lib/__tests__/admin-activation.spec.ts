import { describe, it, expect } from "vitest";
import {
  formatDays,
  formatDaysAfterSignup,
  MILESTONE_LABEL,
  ONBOARDING_STEP_LABEL,
  ONBOARDING_TRACK_LABEL,
} from "../admin-activation";

describe("lib/admin-activation", () => {
  it("descreve a distância até o cadastro", () => {
    expect(formatDaysAfterSignup(null)).toBe("Ainda não aconteceu");
    expect(formatDaysAfterSignup(0)).toBe("No dia do cadastro");
    expect(formatDaysAfterSignup(1)).toBe("1 dia após o cadastro");
    expect(formatDaysAfterSignup(12)).toBe("12 dias após o cadastro");
  });

  it("formata dias com vírgula e plural", () => {
    expect(formatDays(null)).toBe("—");
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(3.5)).toBe("3,5 dias");
  });

  it("tem rótulo para todos os marcos, etapas e trilhas", () => {
    expect(Object.keys(MILESTONE_LABEL)).toHaveLength(5);
    expect(Object.keys(ONBOARDING_STEP_LABEL)).toHaveLength(12);
    expect(Object.keys(ONBOARDING_TRACK_LABEL)).toHaveLength(9);
    expect(ONBOARDING_TRACK_LABEL.agenda).toBe("Marcar uma consulta");
  });
});
