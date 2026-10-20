import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_CORRIDA_ESPERA_MS,
  isSessaoExpirada,
  refreshSession,
} from "./api";

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

describe("refreshSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("quando outra aba já renovou (409), espera e tenta de novo com o cookie novo", async () => {
    vi.useFakeTimers();
    const post = vi
      .spyOn(axios, "post")
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce({ data: { access_token: "token-novo" } });

    const promessa = refreshSession();
    await vi.advanceTimersByTimeAsync(REFRESH_CORRIDA_ESPERA_MS);

    await expect(promessa).resolves.toBe("token-novo");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("não insiste quando a sessão foi recusada (401)", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockRejectedValueOnce({ response: { status: 401 } });

    await expect(refreshSession()).rejects.toEqual({
      response: { status: 401 },
    });
    expect(post).toHaveBeenCalledTimes(1);
  });
});
