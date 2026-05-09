import { describe, it, expect } from "vitest";
import { summarizeErrors } from "@/lib/form-errors";

describe("summarizeErrors", () => {
  it("retorna string vazia sem erros", () => {
    expect(summarizeErrors({})).toBe("");
  });

  it("retorna mensagem direta com 1 erro sem label", () => {
    expect(summarizeErrors({ name: "Nome inválido" })).toBe("Nome inválido");
  });

  it("retorna 'label: mensagem' com 1 erro com label", () => {
    expect(
      summarizeErrors({ name: "Inválido" }, { name: "Nome completo" }),
    ).toBe("Nome completo: Inválido");
  });

  it("lista campos quando há múltiplos erros", () => {
    const out = summarizeErrors(
      { name: "Curto", email: "Inválido" },
      { name: "Nome", email: "E-mail" },
    );
    expect(out).toBe("Corrija os campos: Nome, E-mail");
  });

  it("humaniza nomes camelCase quando faltam labels", () => {
    const out = summarizeErrors({ confirmPassword: "x", phoneNumber: "y" });
    expect(out).toBe("Corrija os campos: confirm password, phone number");
  });
});
