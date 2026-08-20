import { describe, it, expect } from "vitest";
import { resolveStep1Availability } from "./step1-availability";

describe("resolveStep1Availability", () => {
  it("libera a etapa quando e-mail e telefone estão disponíveis", () => {
    expect(
      resolveStep1Availability({
        email: "available",
        phone: "available",
      }),
    ).toEqual({ blocked: false, fieldErrors: {} });
  });

  it("bloqueia e aponta o campo do e-mail quando já há conta ativa", () => {
    const r = resolveStep1Availability({
      email: "registered",
      phone: "available",
    });

    expect(r.blocked).toBe(true);
    expect(r.fieldErrors.email).toBe(
      "Este e-mail já está cadastrado. Faça login ou recupere sua senha.",
    );
    expect(r.fieldErrors.phone).toBeUndefined();
  });

  it("bloqueia com mensagem de convite pendente", () => {
    const r = resolveStep1Availability({
      email: "pending_invite",
      phone: "available",
    });

    expect(r.blocked).toBe(true);
    expect(r.fieldErrors.email).toContain("convite pendente");
  });

  it("bloqueia e aponta o campo do telefone quando o número já é usado", () => {
    const r = resolveStep1Availability({
      email: "available",
      phone: "registered",
    });

    expect(r.blocked).toBe(true);
    expect(r.fieldErrors.phone).toBe(
      "Este telefone já está sendo utilizado por outra conta.",
    );
    expect(r.fieldErrors.email).toBeUndefined();
  });

  // O usuário precisa ver os dois problemas de uma vez; mostrar um, deixar ele
  // corrigir e só então revelar o outro é o que a etapa 1 veio evitar.
  it("aponta os dois campos quando ambos estão ocupados", () => {
    const r = resolveStep1Availability({
      email: "registered",
      phone: "registered",
    });

    expect(r.blocked).toBe(true);
    expect(r.fieldErrors.email).toBeDefined();
    expect(r.fieldErrors.phone).toBeDefined();
  });

  // A checagem é uma comodidade, não um portão: se a rede cair ou o endpoint
  // devolver erro, o cadastro tem de seguir — o submit revalida de qualquer forma.
  it("não bloqueia quando alguma checagem falhou", () => {
    expect(resolveStep1Availability({ email: null, phone: null })).toEqual({
      blocked: false,
      fieldErrors: {},
    });
  });

  it("não bloqueia por causa do e-mail quando só a checagem dele falhou", () => {
    const r = resolveStep1Availability({ email: null, phone: "registered" });

    expect(r.blocked).toBe(true);
    expect(r.fieldErrors.email).toBeUndefined();
    expect(r.fieldErrors.phone).toBeDefined();
  });
});
