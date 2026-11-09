import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import adminApi, {
  clearAdminAccessToken,
  getAdminAccessToken,
  onAdminSessionExpired,
  refreshAdminSession,
  setAdminAccessToken,
} from "../admin-api";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../auth-token";

const admin = {
  id: "a-1",
  name: "Ana",
  email: "ana@inexci.com",
  mfaEnabled: true,
};

function reply(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): Promise<AxiosResponse> {
  const response = { data, status, statusText: "", headers: {}, config };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(
    new AxiosError("erro", "ERR", config, null, response as AxiosResponse),
  );
}

function refreshError(status: number) {
  return new AxiosError("erro", "ERR", undefined, null, {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });
}

let seenAuth: Array<string | undefined>;
let postSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  seenAuth = [];
  clearAdminAccessToken();
  clearAccessToken();
  postSpy = vi.spyOn(axios, "post");
});

afterEach(() => {
  postSpy.mockRestore();
  adminApi.defaults.adapter = undefined;
});

function useAdapter(statuses: number[]) {
  let call = 0;
  adminApi.defaults.adapter = (config) => {
    seenAuth.push(config.headers.Authorization as string | undefined);
    const status = statuses[Math.min(call, statuses.length - 1)];
    call += 1;
    return reply(config, status, { ok: status === 200 });
  };
}

describe("lib/admin-api", () => {
  it("dois 401 simultâneos disparam um único refresh e repetem com o token novo", async () => {
    setAdminAccessToken("velho");
    let resolver: (value: unknown) => void = () => {};
    postSpy.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }) as never,
    );
    const pendentes = new Map<string, number>();
    adminApi.defaults.adapter = (config) => {
      seenAuth.push(config.headers.Authorization as string | undefined);
      const vezes = (pendentes.get(config.url ?? "") ?? 0) + 1;
      pendentes.set(config.url ?? "", vezes);
      return reply(config, vezes === 1 ? 401 : 200, { url: config.url });
    };

    const p1 = adminApi.get("/admin/accounts");
    const p2 = adminApi.get("/admin/team");
    await vi.waitFor(() => expect(postSpy).toHaveBeenCalledTimes(1));
    resolver({ data: { accessToken: "novo", admin } });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ url: "/admin/accounts" });
    expect(r2.data).toEqual({ url: "/admin/team" });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toMatch(/\/admin\/auth\/refresh$/);
    expect(seenAuth.slice(-2)).toEqual(["Bearer novo", "Bearer novo"]);
    expect(getAdminAccessToken()).toBe("novo");
  });

  it("não usa nem altera o token da clínica", async () => {
    setAccessToken("token-clinica");
    setAdminAccessToken("token-admin");
    postSpy.mockResolvedValue({
      data: { accessToken: "admin-2", admin },
    } as never);
    useAdapter([401, 200]);

    await adminApi.get("/admin/plans");

    expect(seenAuth).toEqual(["Bearer token-admin", "Bearer admin-2"]);
    expect(getAccessToken()).toBe("token-clinica");
  });

  it("sem token do admin, não manda o bearer da clínica", async () => {
    setAccessToken("token-clinica");
    useAdapter([200]);
    await adminApi.get("/admin/plans");
    expect(seenAuth).toEqual([undefined]);
  });

  it("refresh recusado encerra a sessão do admin e avisa os ouvintes", async () => {
    setAdminAccessToken("velho");
    postSpy.mockRejectedValue(refreshError(401));
    useAdapter([401]);
    const expirou = vi.fn();
    const sair = onAdminSessionExpired(expirou);

    await expect(adminApi.get("/admin/plans")).rejects.toBeInstanceOf(
      AxiosError,
    );

    expect(expirou).toHaveBeenCalledTimes(1);
    expect(getAdminAccessToken()).toBeNull();
    sair();
  });

  it("falha de rede no refresh não derruba a sessão", async () => {
    setAdminAccessToken("velho");
    postSpy.mockRejectedValue(new Error("offline"));
    useAdapter([401]);
    const expirou = vi.fn();
    const sair = onAdminSessionExpired(expirou);

    await expect(adminApi.get("/admin/plans")).rejects.toThrow("offline");

    expect(expirou).not.toHaveBeenCalled();
    sair();
  });

  it("401 nas etapas do login não tenta refresh", async () => {
    useAdapter([401]);
    await expect(
      adminApi.post("/admin/auth/login/mfa", { mfaToken: "t", code: "1" }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("refreshAdminSession guarda o token em memória e devolve o admin", async () => {
    postSpy.mockResolvedValue({
      data: { accessToken: "abc", admin },
    } as never);
    const sessao = await refreshAdminSession();
    expect(sessao.admin).toEqual(admin);
    expect(getAdminAccessToken()).toBe("abc");
    expect(postSpy.mock.calls[0][2]).toMatchObject({ withCredentials: true });
  });

  it("refreshAdminSession tenta de novo quando outra aba renovou a sessão (409)", async () => {
    postSpy
      .mockRejectedValueOnce(refreshError(409) as never)
      .mockResolvedValueOnce({ data: { accessToken: "xyz", admin } } as never);
    const sessao = await refreshAdminSession();
    expect(sessao.admin).toEqual(admin);
    expect(getAdminAccessToken()).toBe("xyz");
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it("refreshAdminSession não repete em outros erros", async () => {
    postSpy.mockRejectedValueOnce(refreshError(401) as never);
    await expect(refreshAdminSession()).rejects.toBeInstanceOf(AxiosError);
    expect(postSpy).toHaveBeenCalledTimes(1);
  });
});
