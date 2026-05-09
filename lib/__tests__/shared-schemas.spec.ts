import { describe, it, expect } from "vitest";
import {
  fullNameSchema,
  emailSchema,
  emailOptionalSchema,
  phoneSchema,
  phoneOptionalSchema,
  cpfSchema,
  cpfOptionalSchema,
  cnpjSchema,
  cnpjOptionalSchema,
  cepSchema,
  cepOptionalSchema,
  strongPasswordSchema,
} from "@/lib/schemas/shared";

describe("fullNameSchema", () => {
  it("aceita nome completo", () => {
    expect(fullNameSchema.safeParse("João Silva").success).toBe(true);
  });

  it("rejeita um nome só", () => {
    expect(fullNameSchema.safeParse("João").success).toBe(false);
  });

  it("rejeita com números", () => {
    expect(fullNameSchema.safeParse("João Silva 2").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("aceita válido", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
  });

  it("rejeita inválido", () => {
    expect(emailSchema.safeParse("xpto").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("emailOptionalSchema", () => {
  it("aceita vazio/undefined", () => {
    expect(emailOptionalSchema.safeParse("").success).toBe(true);
    expect(emailOptionalSchema.safeParse(undefined).success).toBe(true);
  });

  it("rejeita inválido se preenchido", () => {
    expect(emailOptionalSchema.safeParse("xpto").success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("aceita 10 ou 11 dígitos com máscara", () => {
    expect(phoneSchema.safeParse("(11) 3333-4444").success).toBe(true);
    expect(phoneSchema.safeParse("(11) 98765-4321").success).toBe(true);
  });

  it("rejeita curtos", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("phoneOptionalSchema", () => {
  it("aceita vazio", () => {
    expect(phoneOptionalSchema.safeParse("").success).toBe(true);
  });

  it("rejeita curto se preenchido", () => {
    expect(phoneOptionalSchema.safeParse("123").success).toBe(false);
  });
});

describe("cpfSchema", () => {
  it("aceita CPF válido", () => {
    expect(cpfSchema.safeParse("529.982.247-25").success).toBe(true);
  });

  it("rejeita CPF inválido", () => {
    expect(cpfSchema.safeParse("123.456.789-00").success).toBe(false);
  });

  it("rejeita comprimento errado", () => {
    expect(cpfSchema.safeParse("123").success).toBe(false);
  });
});

describe("cpfOptionalSchema", () => {
  it("aceita vazio", () => {
    expect(cpfOptionalSchema.safeParse("").success).toBe(true);
  });

  it("rejeita inválido se preenchido", () => {
    expect(cpfOptionalSchema.safeParse("111.111.111-11").success).toBe(false);
  });
});

describe("cnpjSchema / cnpjOptionalSchema", () => {
  it("aceita CNPJ válido", () => {
    expect(cnpjSchema.safeParse("11.222.333/0001-81").success).toBe(true);
  });

  it("rejeita CNPJ inválido", () => {
    expect(cnpjSchema.safeParse("11.222.333/0001-00").success).toBe(false);
  });

  it("opcional aceita vazio", () => {
    expect(cnpjOptionalSchema.safeParse("").success).toBe(true);
  });
});

describe("cepSchema / cepOptionalSchema", () => {
  it("aceita CEP de 8 dígitos", () => {
    expect(cepSchema.safeParse("01310-100").success).toBe(true);
  });

  it("rejeita CEP curto", () => {
    expect(cepSchema.safeParse("12345").success).toBe(false);
  });

  it("opcional aceita vazio", () => {
    expect(cepOptionalSchema.safeParse("").success).toBe(true);
  });
});

describe("strongPasswordSchema", () => {
  it("aceita senha forte", () => {
    expect(strongPasswordSchema.safeParse("Senha@123").success).toBe(true);
  });

  it("rejeita curta", () => {
    expect(strongPasswordSchema.safeParse("Sa@1").success).toBe(false);
  });

  it("rejeita sem maiúscula", () => {
    expect(strongPasswordSchema.safeParse("senha@123").success).toBe(false);
  });

  it("rejeita sem minúscula", () => {
    expect(strongPasswordSchema.safeParse("SENHA@123").success).toBe(false);
  });

  it("rejeita sem número", () => {
    expect(strongPasswordSchema.safeParse("Senha@abc").success).toBe(false);
  });

  it("rejeita sem especial", () => {
    expect(strongPasswordSchema.safeParse("Senha1234").success).toBe(false);
  });
});
