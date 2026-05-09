import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _clearCepCache, CepLookupError, isCompleteCep, lookupCep } from "../cep";

describe("isCompleteCep", () => {
  it("retorna true para 8 dígitos com ou sem máscara", () => {
    expect(isCompleteCep("01001000")).toBe(true);
    expect(isCompleteCep("01001-000")).toBe(true);
  });

  it("retorna false para CEP incompleto", () => {
    expect(isCompleteCep("0100100")).toBe(false);
    expect(isCompleteCep("")).toBe(false);
    expect(isCompleteCep(null)).toBe(false);
  });
});

describe("lookupCep", () => {
  const VIACEP_PAYLOAD = {
    cep: "01001-000",
    logradouro: "Praça da Sé",
    complemento: "lado ímpar",
    bairro: "Sé",
    localidade: "São Paulo",
    uf: "SP",
  };

  beforeEach(() => {
    _clearCepCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejeita CEP com tamanho inválido", async () => {
    await expect(lookupCep("123")).rejects.toBeInstanceOf(CepLookupError);
  });

  it("retorna endereço normalizado quando ViaCEP responde", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => VIACEP_PAYLOAD,
    } as Response);

    const result = await lookupCep("01001-000");
    expect(result).toEqual({
      cep: "01001000",
      logradouro: "Praça da Sé",
      complemento: "lado ímpar",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
    });
  });

  it("usa o cache em chamadas subsequentes", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => VIACEP_PAYLOAD,
    } as Response);

    await lookupCep("01001000");
    await lookupCep("01001-000");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("lança erro 'not_found' quando ViaCEP devolve { erro: true }", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response);

    await expect(lookupCep("99999999")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("lança erro 'network' quando fetch falha", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    await expect(lookupCep("01001000")).rejects.toMatchObject({
      code: "network",
    });
  });
});
