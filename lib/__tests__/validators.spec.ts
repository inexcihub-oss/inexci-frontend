import { describe, it, expect } from "vitest";
import {
  isValidCpf,
  isValidCnpj,
  isValidEmail,
  isValidFullName,
  isValidPhone,
  isValidCep,
  passwordChecks,
  passwordStrength,
} from "@/lib/validators";

describe("isValidCpf", () => {
  it("aceita CPFs válidos (com e sem máscara)", () => {
    // CPFs válidos conhecidos
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });

  it("rejeita CPFs com dígitos verificadores inválidos", () => {
    expect(isValidCpf("123.456.789-00")).toBe(false);
    expect(isValidCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita números repetidos (111.111.111-11 etc.)", () => {
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("00000000000")).toBe(false);
    expect(isValidCpf("99999999999")).toBe(false);
  });

  it("rejeita strings com menos/mais de 11 dígitos", () => {
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("123456789012")).toBe(false);
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf(undefined)).toBe(false);
    expect(isValidCpf(null)).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJs válidos (com e sem máscara)", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejeita CNPJs com DV inválido", () => {
    expect(isValidCnpj("11.222.333/0001-00")).toBe(false);
  });

  it("rejeita números repetidos", () => {
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCnpj("123456789012")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
    expect(isValidCnpj(undefined)).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("aceita e-mails comuns", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("joao.silva@exemplo.com.br")).toBe(true);
    expect(isValidEmail("foo+tag@bar.io")).toBe(true);
  });

  it("rejeita formatos inválidos", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nao-tem-arroba")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a@b.c")).toBe(false);
    expect(isValidEmail("@b.co")).toBe(false);
    expect(isValidEmail("a @ b.co")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("isValidFullName", () => {
  it("aceita nome com sobrenome", () => {
    expect(isValidFullName("João Silva")).toBe(true);
    expect(isValidFullName("Maria Aparecida da Silva")).toBe(true);
    expect(isValidFullName("Ana-Júlia Souza")).toBe(true);
  });

  it("rejeita nome sem sobrenome", () => {
    expect(isValidFullName("João")).toBe(false);
  });

  it("rejeita strings curtas ou vazias", () => {
    expect(isValidFullName("")).toBe(false);
    expect(isValidFullName("Jo")).toBe(false);
    expect(isValidFullName(undefined)).toBe(false);
  });

  it("rejeita nome com números", () => {
    expect(isValidFullName("João Silva2")).toBe(false);
  });

  it("rejeita palavras com 1 letra", () => {
    expect(isValidFullName("J Silva")).toBe(false);
  });
});

describe("passwordChecks", () => {
  it("retorna todos false para vazio", () => {
    const c = passwordChecks("");
    expect(c.minLength).toBe(false);
    expect(c.hasUpper).toBe(false);
    expect(c.hasLower).toBe(false);
    expect(c.hasNumber).toBe(false);
    expect(c.hasSpecial).toBe(false);
    expect(c.allValid).toBe(false);
  });

  it("identifica cada requisito individualmente", () => {
    expect(passwordChecks("abcdefgh").hasLower).toBe(true);
    expect(passwordChecks("ABCDEFGH").hasUpper).toBe(true);
    expect(passwordChecks("12345678").hasNumber).toBe(true);
    expect(passwordChecks("!@#$%^&*").hasSpecial).toBe(true);
    expect(passwordChecks("1234567").minLength).toBe(false);
    expect(passwordChecks("12345678").minLength).toBe(true);
  });

  it("allValid quando atende tudo", () => {
    const c = passwordChecks("Senha@123");
    expect(c.allValid).toBe(true);
  });

  it("allValid false faltando qualquer requisito", () => {
    expect(passwordChecks("Senha123").allValid).toBe(false); // falta especial
    expect(passwordChecks("senha@123").allValid).toBe(false); // falta maiúscula
    expect(passwordChecks("SENHA@123").allValid).toBe(false); // falta minúscula
    expect(passwordChecks("Senha@abc").allValid).toBe(false); // falta número
    expect(passwordChecks("Sen@1").allValid).toBe(false); // falta tamanho
  });
});

describe("passwordStrength", () => {
  it("conta requisitos atendidos (0-5)", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("abcdefgh")).toBe(2); // min + lower
    expect(passwordStrength("Abcdefgh")).toBe(3); // min + lower + upper
    expect(passwordStrength("Abcdef12")).toBe(4); // + number
    expect(passwordStrength("Abcdef1@")).toBe(5);
  });
});

describe("isValidPhone / isValidCep", () => {
  it("phone aceita 10 ou 11 dígitos", () => {
    expect(isValidPhone("(11) 3333-4444")).toBe(true);
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("cep aceita 8 dígitos", () => {
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("01310100")).toBe(true);
    expect(isValidCep("12345")).toBe(false);
  });
});
