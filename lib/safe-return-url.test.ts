import { describe, expect, it } from "vitest";
import { resolverReturnUrl } from "./safe-return-url";

const origem = "https://app.inexci.com.br";

describe("resolverReturnUrl", () => {
  it("aceita caminho interno", () => {
    expect(resolverReturnUrl("/solicitacoes-cirurgicas", origem)).toBe(
      "/solicitacoes-cirurgicas",
    );
  });

  it("recusa barra dupla", () => {
    expect(resolverReturnUrl("//evil.com", origem)).toBeNull();
  });

  it("recusa backslash (bypass do filtro por prefixo)", () => {
    expect(resolverReturnUrl("/\\evil.com", origem)).toBeNull();
  });

  it("recusa URL absoluta externa", () => {
    expect(resolverReturnUrl("https://evil.com/x", origem)).toBeNull();
  });

  it("preserva query string interna", () => {
    expect(resolverReturnUrl("/agenda?tab=hoje", origem)).toBe("/agenda?tab=hoje");
  });
});
