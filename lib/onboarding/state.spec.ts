import { describe, it, expect } from "vitest";
import {
  dismissChecklist,
  emptyOnboardingState,
  isChecklistVisible,
  markStepComplete,
  markTourSeen,
  markWelcomeSeen,
  normalizeOnboardingState,
} from "./state";

const AGORA = "2026-08-21T14:00:00.000Z";

describe("normalizeOnboardingState", () => {
  it("trata undefined como estado vazio", () => {
    expect(normalizeOnboardingState(undefined)).toEqual(
      emptyOnboardingState(),
    );
  });

  it("completa campos ausentes", () => {
    const estado = normalizeOnboardingState({ status: "in_progress" });

    expect(estado.status).toBe("in_progress");
    expect(estado.completedSteps).toEqual({});
    expect(estado.toursSeen).toEqual({});
  });
});

describe("markStepComplete", () => {
  it("marca o passo e move o status para in_progress", () => {
    const estado = markStepComplete(
      emptyOnboardingState(),
      "criar-solicitacao",
      AGORA,
    );

    expect(estado.completedSteps["criar-solicitacao"]).toBe(AGORA);
    expect(estado.status).toBe("in_progress");
  });

  it("não muta o estado recebido", () => {
    const original = emptyOnboardingState();
    markStepComplete(original, "criar-solicitacao", AGORA);

    expect(original.completedSteps).toEqual({});
  });

  /** Dispensar é escolha do usuário; concluir um passo não a desfaz. */
  it("não ressuscita um checklist dispensado", () => {
    const dispensado = dismissChecklist(emptyOnboardingState(), AGORA);
    const estado = markStepComplete(dispensado, "criar-solicitacao", AGORA);

    expect(estado.checklistDismissedAt).toBe(AGORA);
    expect(isChecklistVisible(estado)).toBe(false);
  });
});

describe("markTourSeen", () => {
  it("carimba a trilha", () => {
    const estado = markTourSeen(emptyOnboardingState(), "solicitacoes", AGORA);

    expect(estado.toursSeen.solicitacoes).toBe(AGORA);
  });
});

describe("markWelcomeSeen", () => {
  it("carimba e não volta a aparecer", () => {
    const estado = markWelcomeSeen(emptyOnboardingState(), AGORA);

    expect(estado.welcomeSeenAt).toBe(AGORA);
  });
});

describe("isChecklistVisible", () => {
  it("some quando dispensado", () => {
    expect(
      isChecklistVisible(dismissChecklist(emptyOnboardingState(), AGORA)),
    ).toBe(false);
  });

  it("some quando concluído", () => {
    expect(
      isChecklistVisible({ ...emptyOnboardingState(), status: "completed" }),
    ).toBe(false);
  });

  it("aparece para quem está no meio", () => {
    expect(
      isChecklistVisible({ ...emptyOnboardingState(), status: "in_progress" }),
    ).toBe(true);
  });
});
