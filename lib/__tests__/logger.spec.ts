import { describe, it, expect, vi, afterEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { logger, serializeError } from "../logger";

function criarAxiosError(): AxiosError {
  const headers = new AxiosHeaders({ Authorization: "Bearer segredo" });
  const config = { url: "/patients?cpf=123", method: "get", headers };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config,
    data: { cpf: "12345678900" },
  });
}

describe("serializeError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("descarta headers, config e request de um AxiosError", () => {
    const resultado = serializeError(criarAxiosError());
    const texto = JSON.stringify(resultado);

    expect(texto).not.toContain("segredo");
    expect(texto).not.toContain("Authorization");
    expect(texto).not.toContain("12345678900");
    expect(resultado).toMatchObject({
      message: "Request failed",
      code: "ERR_BAD_REQUEST",
      status: 401,
      method: "GET",
      url: "/patients",
    });
  });

  it("limpa objetos comuns que carregam headers ou tokens", () => {
    const resultado = serializeError({
      motivo: "x",
      headers: { Authorization: "Bearer segredo" },
      config: { headers: {} },
      response: { status: 500, data: { cpf: "1" } },
      nested: { access_token: "abc", ok: true },
    });

    expect(resultado).toEqual({
      motivo: "x",
      response: { status: 500 },
      nested: { ok: true },
    });
  });

  it("mantém valores primitivos", () => {
    expect(serializeError("texto")).toBe("texto");
    expect(serializeError(undefined)).toBeUndefined();
  });

  it("warn não imprime o Authorization de um AxiosError", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("falhou", criarAxiosError());

    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain("segredo");
  });

  it("error não imprime o Authorization de um AxiosError", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("falhou", criarAxiosError());

    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain("segredo");
  });
});
