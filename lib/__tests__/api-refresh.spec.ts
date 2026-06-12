import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do axios: `create` devolve um client mínimo (defaults + interceptors) e
// `post` é controlável para inspecionar o single-flight do refresh.
// `vi.hoisted` garante que `postMock` exista quando a factory (hoisted) roda.
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("axios", () => {
  const create = vi.fn(() => ({
    defaults: { baseURL: "http://api.test" },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));
  return {
    default: { create, post: postMock },
    AxiosError: class AxiosError extends Error {},
  };
});

import { refreshSession } from "../api";
import { getAccessToken, clearAccessToken } from "../auth-token";

describe("refreshSession (single-flight)", () => {
  beforeEach(() => {
    postMock.mockReset();
    clearAccessToken();
  });

  it("dois refreshes concorrentes disparam um único POST /auth/refresh", async () => {
    let resolvePost: (v: unknown) => void = () => {};
    postMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const p1 = refreshSession();
    const p2 = refreshSession();

    // Ambas aguardam a mesma requisição em voo.
    expect(postMock).toHaveBeenCalledTimes(1);

    resolvePost({ data: { access_token: "new-token" } });
    const [t1, t2] = await Promise.all([p1, p2]);

    expect(t1).toBe("new-token");
    expect(t2).toBe("new-token");
    expect(getAccessToken()).toBe("new-token");
  });

  it("permite um novo refresh após o anterior concluir", async () => {
    postMock.mockResolvedValueOnce({ data: { access_token: "token-1" } });
    expect(await refreshSession()).toBe("token-1");

    postMock.mockResolvedValueOnce({ data: { access_token: "token-2" } });
    expect(await refreshSession()).toBe("token-2");

    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it("propaga erro e libera o single-flight para nova tentativa", async () => {
    postMock.mockRejectedValueOnce(new Error("falhou"));
    await expect(refreshSession()).rejects.toThrow("falhou");

    // O lock foi liberado: nova tentativa dispara outro POST.
    postMock.mockResolvedValueOnce({ data: { access_token: "token-ok" } });
    expect(await refreshSession()).toBe("token-ok");
  });
});
