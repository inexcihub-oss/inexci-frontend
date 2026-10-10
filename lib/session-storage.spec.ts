import { describe, it, expect, beforeEach } from "vitest";
import {
  clearStoredUser,
  hasStoredSession,
  parseStoredUser,
  readStoredUser,
  STORED_USER_KEY,
  writeStoredUser,
} from "./session-storage";

describe("session-storage", () => {
  beforeEach(() => localStorage.clear());

  it("vazio quando não há nada ou há os literais antigos", () => {
    expect(parseStoredUser()).toEqual({ kind: "empty" });
    localStorage.setItem(STORED_USER_KEY, "undefined");
    expect(parseStoredUser()).toEqual({ kind: "empty" });
    localStorage.setItem(STORED_USER_KEY, "null");
    expect(hasStoredSession()).toBe(false);
  });

  it("inválido quando o JSON está corrompido ou sem id", () => {
    localStorage.setItem(STORED_USER_KEY, "{quebrado");
    expect(parseStoredUser()).toEqual({ kind: "invalid" });
    localStorage.setItem(STORED_USER_KEY, JSON.stringify({ name: "x" }));
    expect(parseStoredUser()).toEqual({ kind: "invalid" });
    expect(readStoredUser()).toBeNull();
  });

  it("grava, lê e limpa", () => {
    writeStoredUser({ id: "u1", email: "a@b.com" });
    expect(readStoredUser<{ id: string; email: string }>()).toEqual({
      id: "u1",
      email: "a@b.com",
    });
    expect(hasStoredSession()).toBe(true);
    clearStoredUser();
    expect(localStorage.getItem(STORED_USER_KEY)).toBeNull();
  });
});
