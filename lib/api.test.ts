import { describe, expect, it } from "vitest";
import { isSessaoExpirada } from "./api";

/**
 * D-18: um 429 do throttler no `/auth/refresh` derrubava a sessão.
 *
 * `/auth/refresh` é chamado a cada carregamento de página e o backend limita a
 * 10 chamadas por minuto; quem navega rápido, ou tem várias abas abertas,
 * recebia 429 e era mandado para o login com o cookie de refresh ainda válido.
 * A distinção entre "acabou" e "não deu agora" é o que impede isso — por isso
 * ela é testada em separado do interceptor.
 */
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
