import { describe, it, expect } from "vitest";
import { classifyRegisterError } from "./register-error";

describe("classifyRegisterError", () => {
  it("classifica e-mail já cadastrado como email_active", () => {
    expect(
      classifyRegisterError(
        "Este e-mail já está cadastrado. Faça login ou recupere sua senha.",
      ),
    ).toBe("email_active");
  });

  it("classifica convite pendente como email_pending", () => {
    expect(
      classifyRegisterError(
        "Este e-mail está associado a um convite pendente. Verifique sua caixa de entrada para ativar sua conta.",
      ),
    ).toBe("email_pending");
  });

  it("classifica telefone em uso como phone_active", () => {
    expect(
      classifyRegisterError(
        "Este telefone já está sendo utilizado por outra conta.",
      ),
    ).toBe("phone_active");
  });

  // O erro de telefone não pode cair no ramo de e-mail: o bloco de email_active
  // oferece "Fazer login" e "Recuperar senha", que não resolvem nada para quem
  // digitou um telefone repetido — mandaria o usuário para o lugar errado.
  it("não confunde o erro de telefone com o de e-mail", () => {
    expect(
      classifyRegisterError(
        "Este telefone já está sendo utilizado por outra conta.",
      ),
    ).not.toBe("email_active");
  });

  it("cai em generic quando a mensagem é desconhecida", () => {
    expect(classifyRegisterError("Erro inesperado no servidor")).toBe(
      "generic",
    );
  });
});
