import { describe, expect, it } from "vitest";
import { isSessaoExpirada } from "./api";

describe("isSessaoExpirada", () => {
  it.each([400, 401, 403])(
    "considera a sessão encerrada no status %i",
    (status) => {
      expect(isSessaoExpirada({ response: { status } })).toBe(true);
    },
  );

  it.each([408, 429, 500, 502, 503])(
    "trata o status %i como falha transitória",
    (status) => {
      expect(isSessaoExpirada({ response: { status } })).toBe(false);
    },
  );

  it("trata erro de rede (sem resposta) como transitório", () => {
    expect(isSessaoExpirada(new Error("Network Error"))).toBe(false);
    expect(isSessaoExpirada(undefined)).toBe(false);
    expect(isSessaoExpirada({ code: "ECONNABORTED" })).toBe(false);
  });
});
