import { describe, it, expect } from "vitest";
import { step1Schema } from "./cadastro.schema";

describe("step1Schema (cadastro)", () => {
  const validData = {
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 98888-7777",
    password: "Senha@123",
    confirmPassword: "Senha@123",
  };

  it("aceita dados válidos com telefone preenchido", () => {
    const result = step1Schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejeita quando o telefone está vazio", () => {
    const result = step1Schema.safeParse({ ...validData, phone: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find(
        (i) => i.path[0] === "phone",
      );
      expect(phoneIssue).toBeDefined();
    }
  });

  it("rejeita quando o telefone está ausente", () => {
    const { phone: _phone, ...withoutPhone } = validData;
    const result = step1Schema.safeParse(withoutPhone);
    expect(result.success).toBe(false);
  });

  it("rejeita quando o telefone tem menos de 10 dígitos", () => {
    const result = step1Schema.safeParse({ ...validData, phone: "1234" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find(
        (i) => i.path[0] === "phone",
      );
      expect(phoneIssue).toBeDefined();
    }
  });

  it("aceita telefone fixo (10 dígitos)", () => {
    const result = step1Schema.safeParse({
      ...validData,
      phone: "(11) 2233-4455",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando as senhas não coincidem", () => {
    const result = step1Schema.safeParse({
      ...validData,
      confirmPassword: "Outra@123",
    });
    expect(result.success).toBe(false);
  });
});
