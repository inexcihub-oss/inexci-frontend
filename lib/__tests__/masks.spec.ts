import { describe, it, expect } from "vitest";
import {
  unmask,
  maskCpf,
  maskCnpj,
  maskCpfCnpj,
  maskPhone,
  maskCep,
  applyMask,
} from "@/lib/masks";

describe("unmask", () => {
  it("retorna string vazia para nullish", () => {
    expect(unmask(undefined)).toBe("");
    expect(unmask(null)).toBe("");
    expect(unmask("")).toBe("");
  });

  it("remove tudo que não é dígito", () => {
    expect(unmask("(11) 98765-4321")).toBe("11987654321");
    expect(unmask("abc 123 def")).toBe("123");
  });
});

describe("maskCpf", () => {
  it("formata progressivamente", () => {
    expect(maskCpf("")).toBe("");
    expect(maskCpf("12")).toBe("12");
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("123456")).toBe("123.456");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("123456789")).toBe("123.456.789");
    expect(maskCpf("1234567890")).toBe("123.456.789-0");
    expect(maskCpf("12345678901")).toBe("123.456.789-01");
  });

  it("ignora caracteres não numéricos", () => {
    expect(maskCpf("abc12345678901xyz")).toBe("123.456.789-01");
  });

  it("trunca dígitos extras", () => {
    expect(maskCpf("12345678901999")).toBe("123.456.789-01");
  });
});

describe("maskCnpj", () => {
  it("formata progressivamente", () => {
    expect(maskCnpj("12")).toBe("12");
    expect(maskCnpj("123")).toBe("12.3");
    expect(maskCnpj("12345")).toBe("12.345");
    expect(maskCnpj("12345678")).toBe("12.345.678");
    expect(maskCnpj("123456789012")).toBe("12.345.678/9012");
    expect(maskCnpj("12345678901234")).toBe("12.345.678/9012-34");
  });

  it("trunca dígitos extras", () => {
    expect(maskCnpj("123456789012349999")).toBe("12.345.678/9012-34");
  });
});

describe("maskCpfCnpj", () => {
  it("usa máscara de CPF até 11 dígitos", () => {
    expect(maskCpfCnpj("12345678901")).toBe("123.456.789-01");
  });

  it("usa máscara de CNPJ a partir de 12 dígitos", () => {
    expect(maskCpfCnpj("123456789012")).toBe("12.345.678/9012");
    expect(maskCpfCnpj("12345678901234")).toBe("12.345.678/9012-34");
  });
});

describe("maskPhone", () => {
  it("formata fixo (10 dígitos)", () => {
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata celular (11 dígitos)", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata progressivamente", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("11")).toBe("(11");
    expect(maskPhone("119")).toBe("(11) 9");
    expect(maskPhone("11987")).toBe("(11) 987");
    expect(maskPhone("1198765")).toBe("(11) 9876-5");
  });
});

describe("maskCep", () => {
  it("formata progressivamente", () => {
    expect(maskCep("")).toBe("");
    expect(maskCep("12345")).toBe("12345");
    expect(maskCep("123456")).toBe("12345-6");
    expect(maskCep("12345678")).toBe("12345-678");
  });

  it("trunca dígitos extras", () => {
    expect(maskCep("123456789999")).toBe("12345-678");
  });
});

describe("applyMask", () => {
  it("delega para a máscara correta", () => {
    expect(applyMask("cpf", "12345678901")).toBe("123.456.789-01");
    expect(applyMask("cnpj", "12345678901234")).toBe("12.345.678/9012-34");
    expect(applyMask("phone", "11987654321")).toBe("(11) 98765-4321");
    expect(applyMask("cep", "12345678")).toBe("12345-678");
    expect(applyMask("cpfCnpj", "123456789012")).toBe("12.345.678/9012");
  });
});
