import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth-token";
import { mfaService } from "./mfa.service";
import { authService } from "./auth.service";

const post = api.post as ReturnType<typeof vi.fn>;

describe("mfaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAccessToken();
    localStorage.clear();
  });

  it("setup chama POST /auth/mfa/setup e devolve chave e URI", async () => {
    const data = {
      secret: "ABCD",
      formattedSecret: "ABCD",
      otpauthUri: "otpauth://totp/INEXCI:a?secret=ABCD",
    };
    post.mockResolvedValue({ data });

    await expect(mfaService.setup()).resolves.toEqual(data);
    expect(post).toHaveBeenCalledWith("/auth/mfa/setup", {});
  });

  it("enable envia o código sem espaços", async () => {
    post.mockResolvedValue({ data: { recoveryCodes: ["A"] } });

    await mfaService.enable(" 123456 ");

    expect(post).toHaveBeenCalledWith("/auth/mfa/enable", { code: "123456" });
  });

  it("disable troca o access token pelo da sessão reaberta", async () => {
    post.mockResolvedValue({
      data: { message: "ok", access_token: "novo-token" },
    });

    await mfaService.disable("Senha123@", "123456");

    expect(post).toHaveBeenCalledWith("/auth/mfa/disable", {
      password: "Senha123@",
      code: "123456",
    });
    expect(getAccessToken()).toBe("novo-token");
  });

  it("regenerateRecoveryCodes chama POST /auth/mfa/recovery-codes", async () => {
    post.mockResolvedValue({ data: { recoveryCodes: ["B"] } });

    await expect(mfaService.regenerateRecoveryCodes("123456")).resolves.toEqual(
      { recoveryCodes: ["B"] },
    );
    expect(post).toHaveBeenCalledWith("/auth/mfa/recovery-codes", {
      code: "123456",
    });
  });
});

describe("authService com MFA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAccessToken();
    localStorage.clear();
  });

  it("login com desafio de MFA não grava token nem usuário", async () => {
    post.mockResolvedValue({ data: { mfaRequired: true, mfaToken: "t" } });

    const result = await authService.login({ email: "a@b.com", password: "x" });

    expect(result).toEqual({ mfaRequired: true, mfaToken: "t" });
    expect(getAccessToken()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it("loginMfa envia token + código e grava a sessão", async () => {
    post.mockResolvedValue({
      data: {
        access_token: "jwt",
        user: { id: "u-1", email: "a@b.com", name: "A" },
      },
    });

    await authService.loginMfa("t", " 123456 ");

    expect(post).toHaveBeenCalledWith("/auth/login/mfa", {
      mfaToken: "t",
      code: "123456",
    });
    expect(getAccessToken()).toBe("jwt");
    expect(authService.getCurrentUser()?.id).toBe("u-1");
  });
});
