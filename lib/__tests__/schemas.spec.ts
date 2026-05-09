import { describe, it, expect } from "vitest";
import { step1Schema, step2Schema } from "@/lib/schemas/cadastro.schema";
import {
  profileSchema,
  changePasswordSchema,
} from "@/lib/schemas/configuracoes.schema";

// ─── step1Schema ──────────────────────────────────────────────────────────────

describe("step1Schema (dados pessoais de cadastro)", () => {
  const valid = {
    name: "João Silva",
    email: "joao@exemplo.com",
    password: "Senha@123",
    confirmPassword: "Senha@123",
  };

  it("aceita dados válidos", () => {
    expect(step1Schema.safeParse(valid).success).toBe(true);
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const r = step1Schema.safeParse({ ...valid, name: "Jo" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/3 caracteres/);
  });

  it("rejeita nome sem sobrenome", () => {
    const r = step1Schema.safeParse({ ...valid, name: "João" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/sobrenome/i);
  });

  it("rejeita nome com mais de 100 caracteres", () => {
    const longo = "Aa ".repeat(50);
    const r = step1Schema.safeParse({ ...valid, name: longo });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/100 caracteres/);
  });

  it("rejeita e-mail inválido", () => {
    const r = step1Schema.safeParse({ ...valid, email: "nao-e-email" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/e-mail válido/i);
  });

  it("rejeita e-mail vazio", () => {
    const r = step1Schema.safeParse({ ...valid, email: "" });
    expect(r.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const r = step1Schema.safeParse({
      ...valid,
      password: "Aa@1",
      confirmPassword: "Aa@1",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/8 caracteres/);
  });

  it("rejeita senha sem maiúscula/minúscula/número/especial", () => {
    const r = step1Schema.safeParse({
      ...valid,
      password: "senhasenha",
      confirmPassword: "senhasenha",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(
      /maiúscula.*minúscula.*número.*especial/i,
    );
  });

  it("rejeita senha com mais de 128 caracteres", () => {
    const longa = "Aa@1" + "x".repeat(125);
    const r = step1Schema.safeParse({
      ...valid,
      password: longa,
      confirmPassword: longa,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/128 caracteres/);
  });

  it("rejeita quando senhas não coincidem", () => {
    const r = step1Schema.safeParse({
      ...valid,
      confirmPassword: "Diferente@1",
    });
    expect(r.success).toBe(false);
    const issue = r.error?.issues.find((i) =>
      i.path.includes("confirmPassword"),
    );
    expect(issue?.message).toMatch(/não coincidem/);
  });
});

// ─── step2Schema ──────────────────────────────────────────────────────────────

describe("step2Schema (perfil de cadastro)", () => {
  it("aceita gestor (isDoctor: false) sem CRM", () => {
    const r = step2Schema.safeParse({
      isDoctor: false,
      crm: "",
      crmState: "",
    });
    expect(r.success).toBe(true);
  });

  it("aceita médico com CRM e estado preenchidos", () => {
    const r = step2Schema.safeParse({
      isDoctor: true,
      crm: "12345",
      crmState: "SP",
      specialty: "Cardiologia",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita médico sem CRM", () => {
    const r = step2Schema.safeParse({
      isDoctor: true,
      crm: "",
      crmState: "SP",
    });
    expect(r.success).toBe(false);
    const msgs = r.error?.issues.map((i) => i.message) ?? [];
    expect(msgs.some((m) => m.match(/CRM/i))).toBe(true);
  });

  it("rejeita médico sem estado do CRM", () => {
    const r = step2Schema.safeParse({
      isDoctor: true,
      crm: "12345",
      crmState: "",
    });
    expect(r.success).toBe(false);
    const msgs = r.error?.issues.map((i) => i.message) ?? [];
    expect(msgs.some((m) => m.match(/estado.*CRM/i))).toBe(true);
  });

  it("rejeita médico sem CRM e sem estado — reporta os dois erros", () => {
    const r = step2Schema.safeParse({
      isDoctor: true,
      crm: "",
      crmState: "",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.length).toBe(2);
  });

  it("aceita médico sem specialty (campo opcional)", () => {
    const r = step2Schema.safeParse({
      isDoctor: true,
      crm: "12345",
      crmState: "RJ",
    });
    expect(r.success).toBe(true);
  });
});

// ─── profileSchema ────────────────────────────────────────────────────────────

describe("profileSchema (perfil em configurações)", () => {
  const valid = {
    name: "Maria Oliveira",
    email: "maria@exemplo.com",
  };

  it("aceita perfil mínimo (nome + e-mail)", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita perfil completo com campos opcionais e CPF válido", () => {
    const r = profileSchema.safeParse({
      ...valid,
      phone: "11987654321",
      document: "529.982.247-25",
      birthDate: "1990-01-01",
      gender: "female",
      specialty: "Ortopedia",
      crm: "99999",
      crmState: "MG",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const r = profileSchema.safeParse({ ...valid, name: "Ab" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/3 caracteres/);
  });

  it("rejeita nome sem sobrenome", () => {
    const r = profileSchema.safeParse({ ...valid, name: "Maria" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/sobrenome/i);
  });

  it("rejeita e-mail inválido", () => {
    const r = profileSchema.safeParse({ ...valid, email: "invalido" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/e-mail válido/i);
  });

  it("rejeita telefone com menos de 10 dígitos", () => {
    const r = profileSchema.safeParse({ ...valid, phone: "(11) 1234" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/telefone válido/i);
  });

  it("aceita telefone com formatação (máscara) se tiver 10+ dígitos", () => {
    const r = profileSchema.safeParse({ ...valid, phone: "(11) 9876-5432" });
    expect(r.success).toBe(true);
  });

  it("aceita phone vazio/undefined (campo opcional)", () => {
    expect(profileSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...valid }).success).toBe(true);
  });

  it("rejeita CPF com número de dígitos errado", () => {
    const r = profileSchema.safeParse({ ...valid, document: "123" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/11 dígitos/);
  });

  it("rejeita CPF com DV inválido", () => {
    const r = profileSchema.safeParse({
      ...valid,
      document: "123.456.789-01",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/CPF inválido/i);
  });

  it("aceita CPF válido com formatação", () => {
    const r = profileSchema.safeParse({
      ...valid,
      document: "529.982.247-25",
    });
    expect(r.success).toBe(true);
  });

  it("aceita document vazio/undefined (campo opcional)", () => {
    expect(profileSchema.safeParse({ ...valid, document: "" }).success).toBe(
      true,
    );
  });
});

// ─── changePasswordSchema ─────────────────────────────────────────────────────

describe("changePasswordSchema (alterar senha)", () => {
  const valid = {
    currentPassword: "senhaAtual123",
    newPassword: "NovaSenha@456",
    confirmPassword: "NovaSenha@456",
  };

  it("aceita dados válidos", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita sem senha atual", () => {
    const r = changePasswordSchema.safeParse({ ...valid, currentPassword: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/senha atual/i);
  });

  it("rejeita nova senha com menos de 8 caracteres", () => {
    const r = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "Aa@1",
      confirmPassword: "Aa@1",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/8 caracteres/);
  });

  it("rejeita nova senha sem requisitos de força", () => {
    const r = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "senha1234",
      confirmPassword: "senha1234",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(
      /maiúscula.*minúscula.*número.*especial/i,
    );
  });

  it("rejeita nova senha com mais de 128 caracteres", () => {
    const longa = "Aa@1" + "x".repeat(125);
    const r = changePasswordSchema.safeParse({
      ...valid,
      newPassword: longa,
      confirmPassword: longa,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/128 caracteres/);
  });

  it("rejeita quando confirmação de senha não coincide", () => {
    const r = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "Diferente@1",
    });
    expect(r.success).toBe(false);
    const issue = r.error?.issues.find((i) =>
      i.path.includes("confirmPassword"),
    );
    expect(issue?.message).toMatch(/não coincidem/);
  });

  it("rejeita confirmação de senha vazia", () => {
    const r = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "",
    });
    expect(r.success).toBe(false);
  });
});
