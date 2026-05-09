import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCepLookup } from "../useCepLookup";
import { _clearCepCache } from "@/lib/cep";

const VIACEP_PAYLOAD = {
  cep: "01001-000",
  logradouro: "Praça da Sé",
  complemento: "lado ímpar",
  bairro: "Sé",
  localidade: "São Paulo",
  uf: "SP",
};

describe("useCepLookup", () => {
  beforeEach(() => {
    _clearCepCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não dispara busca quando CEP está incompleto", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const onResolved = vi.fn();
    renderHook(() => useCepLookup({ cep: "0100", onResolved }));
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("dispara busca quando CEP completa 8 dígitos e chama onResolved", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => VIACEP_PAYLOAD,
    } as Response);
    const onResolved = vi.fn();
    renderHook(() => useCepLookup({ cep: "01001-000", onResolved }));

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: "01001000",
          logradouro: "Praça da Sé",
          cidade: "São Paulo",
          uf: "SP",
        }),
      );
    });
  });

  it("propaga erro via onError quando ViaCEP não encontra o CEP", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response);
    const onError = vi.fn();
    renderHook(() =>
      useCepLookup({ cep: "99999999", onResolved: vi.fn(), onError }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "not_found" }),
      );
    });
  });

  it("não dispara busca quando enabled=false", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    renderHook(() =>
      useCepLookup({
        cep: "01001000",
        onResolved: vi.fn(),
        enabled: false,
      }),
    );
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
