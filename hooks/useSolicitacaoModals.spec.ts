import { describe, it, expect } from "vitest";
import { solicitacaoModalsReducer } from "./useSolicitacaoModals";

describe("solicitacaoModalsReducer", () => {
  it("abre um modal por vez", () => {
    const a = solicitacaoModalsReducer({ open: null }, {
      type: "open",
      kind: "send",
    });
    const b = solicitacaoModalsReducer(a, { type: "open", kind: "invoice" });
    expect(b.open).toBe("invoice");
  });

  it("fechar um modal específico não derruba o que o substituiu", () => {
    const state = { open: "notification" as const };
    expect(
      solicitacaoModalsReducer(state, { type: "close", kind: "send" }),
    ).toBe(state);
  });

  it("fechar sem alvo fecha o atual", () => {
    expect(
      solicitacaoModalsReducer({ open: "close" }, { type: "close" }).open,
    ).toBeNull();
  });
});
