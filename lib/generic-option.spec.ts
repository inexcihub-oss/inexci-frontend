import { describe, expect, it } from "vitest";
import {
  GENERIC_OPTION_NAME,
  MIN_OPME_OPTIONS,
  isGenericOptionName,
  padWithGenericOption,
} from "./generic-option";

describe("opção genérica do OPME", () => {
  it("completa até o mínimo exigido pela plataforma", () => {
    expect(padWithGenericOption(["Sintex"])).toEqual([
      "Sintex",
      GENERIC_OPTION_NAME,
      GENERIC_OPTION_NAME,
    ]);
  });

  it("conta o que já foi resolvido por id", () => {
    expect(padWithGenericOption(["Sintex"], 1)).toEqual([
      "Sintex",
      GENERIC_OPTION_NAME,
    ]);
  });

  it("não mexe na lista que já atingiu o mínimo", () => {
    const cheia = ["A", "B", "C"];
    expect(padWithGenericOption(cheia)).toEqual(cheia);
  });

  it("traz o plural legado para o nome canônico", () => {
    // Solicitação antiga e modelo salvo ainda carregam "Outros". Sem
    // normalizar, a lista de slots aparece com os dois nomes misturados.
    expect(padWithGenericOption(["Outros"])).toEqual([
      "Outro",
      "Outro",
      "Outro",
    ]);
    expect(isGenericOptionName("OUTROS ")).toBe(true);
    expect(isGenericOptionName("Sintex")).toBe(false);
  });

  it("usa o singular — é uma escolha única, não uma categoria", () => {
    expect(GENERIC_OPTION_NAME).toBe("Outro");
    expect(MIN_OPME_OPTIONS).toBe(3);
  });
});
