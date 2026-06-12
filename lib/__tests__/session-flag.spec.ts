import { describe, it, expect, beforeEach } from "vitest";
import {
  markSession,
  clearSessionFlag,
  hasSessionHint,
} from "../session-flag";

describe("session-flag", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hasSessionHint é false por padrão (visitante anônimo)", () => {
    expect(hasSessionHint()).toBe(false);
  });

  it("markSession habilita a pista de sessão", () => {
    markSession();
    expect(hasSessionHint()).toBe(true);
  });

  it("clearSessionFlag remove a pista", () => {
    markSession();
    clearSessionFlag();
    expect(hasSessionHint()).toBe(false);
  });
});
