import { describe, it, expect } from "vitest";
import {
  dismissChecklist,
  emptyOnboardingState,
  isChecklistVisible,
  markStepComplete,
  markTourSeen,
  markWelcomeSeen,
  normalizeOnboardingState,
  promoteIfComplete,
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

  /**
   * Continua visível quando concluído: é aí que mostra `CHECKLIST.concluido`
   * ("Tudo pronto…") em vez de sumir em silêncio assim que a última trilha é
   * marcada. Só "Dispensar" (`checklistDismissedAt`) o esconde de vez.
   */
  it("continua visível quando concluído — mostra a mensagem de conclusão até ser dispensado", () => {
    expect(
      isChecklistVisible({ ...emptyOnboardingState(), status: "completed" }),
    ).toBe(true);
  });

  it("aparece para quem está no meio", () => {
    expect(
      isChecklistVisible({ ...emptyOnboardingState(), status: "in_progress" }),
    ).toBe(true);
  });
});

describe("promoteIfComplete", () => {
  it("promove para completed quando todo stepKey visível está em completedSteps", () => {
    const estado = markStepComplete(
      emptyOnboardingState(),
      "criar-solicitacao",
      AGORA,
    );

    const promovido = promoteIfComplete(estado, ["criar-solicitacao"]);

    expect(promovido.status).toBe("completed");
  });

  it("não promove enquanto falta stepKey visível", () => {
    const estado = markStepComplete(
      emptyOnboardingState(),
      "criar-solicitacao",
      AGORA,
    );

    const naoPromovido = promoteIfComplete(estado, [
      "criar-solicitacao",
      "assinatura-do-medico",
    ]);

    expect(naoPromovido.status).not.toBe("completed");
  });

  it("não promove sem nenhuma trilha visível", () => {
    const estado = { ...emptyOnboardingState(), status: "in_progress" as const };

    expect(promoteIfComplete(estado, []).status).toBe("in_progress");
  });

  /**
   * `dismissChecklist` só grava `checklistDismissedAt` — não mexe em
   * `status`. Dispensar e concluir são eixos independentes: quem esconde o
   * card é `checklistDismissedAt` (`isChecklistVisible`), não `status`. Por
   * isso completar a última trilha depois de dispensado AINDA promove — não
   * há nada de errado nisso, e "resgredir" aqui seria inventar uma regra que
   * a spec não pede.
   */
  it("promove mesmo com o checklist dispensado — dispensar e concluir são eixos independentes", () => {
    const dispensado = dismissChecklist(emptyOnboardingState(), AGORA);
    const comPasso = markStepComplete(dispensado, "criar-solicitacao", AGORA);

    expect(promoteIfComplete(comPasso, ["criar-solicitacao"]).status).toBe(
      "completed",
    );
  });

  it("não altera um estado já completed (curto-circuita antes de olhar completedSteps)", () => {
    const completo = { ...emptyOnboardingState(), status: "completed" as const };

    expect(promoteIfComplete(completo, ["criar-solicitacao"])).toBe(completo);
  });

  it("não muta o estado recebido", () => {
    const estado = markStepComplete(
      emptyOnboardingState(),
      "criar-solicitacao",
      AGORA,
    );

    promoteIfComplete(estado, ["criar-solicitacao"]);

    expect(estado.status).toBe("in_progress");
  });
});
