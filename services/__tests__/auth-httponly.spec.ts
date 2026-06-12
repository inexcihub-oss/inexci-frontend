/**
 * Testes para verificar que o refresh_token NÃO é armazenado no localStorage.
 * O refresh_token agora é gerenciado via cookie httpOnly pelo backend.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    _store: store,
    _reset: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock axios
vi.mock("axios", () => {
  const instance = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { baseURL: "http://localhost:3000" },
  };
  return {
    default: {
      create: vi.fn(() => instance),
      post: vi.fn(),
    },
  };
});

describe("Auth — tokens sensíveis não devem estar no localStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("authService.logout NÃO deve tentar remover refresh_token do localStorage", async () => {
    // Import fresh
    const { authService } = await import("@/services/auth.service");

    // Mock api.post for logout call
    const api = (await import("@/lib/api")).default;
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    localStorage.setItem("user", JSON.stringify({ id: "1", email: "a@b.com" }));

    await authService.logout();

    // Deve remover user
    expect(localStorage.removeItem).toHaveBeenCalledWith("user");

    // NÃO deve tentar remover refresh_token
    expect(localStorage.removeItem).not.toHaveBeenCalledWith("refresh_token");
  });

  it("authService.login deve limpar chaves legadas token e token_timestamp do localStorage", async () => {
    const api = (await import("@/lib/api")).default;
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        user: { id: "1", name: "Test", email: "a@b.com", role: "admin" },
        access_token: "jwt-123",
        refresh_token: "rt-ignored",
      },
    });

    // Simula chaves legadas presentes
    localStorage.setItem("token", "old-jwt-value");
    localStorage.setItem("token_timestamp", "1234567890");

    const { authService } = await import("@/services/auth.service");
    await authService.login({ email: "a@b.com", password: "123" });

    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token_timestamp");
  });

  it("authService.getCurrentUser deve limpar chaves legadas ao ser chamado", async () => {
    localStorage.setItem("token", "old-jwt");
    localStorage.setItem("token_timestamp", "999");
    localStorage.setItem("user", JSON.stringify({ id: "1", email: "a@b.com" }));

    const { authService } = await import("@/services/auth.service");
    authService.getCurrentUser();

    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token_timestamp");
  });

  it("validateRecoveryCode retorna o resetToken devolvido pelo backend", async () => {
    const api = (await import("@/lib/api")).default;
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { message: "ok", resetToken: "reset-tok-123" },
    });

    const { authService } = await import("@/services/auth.service");
    const token = await authService.validateRecoveryCode(
      "a@b.com",
      "123456",
    );

    expect(token).toBe("reset-tok-123");
    expect(api.post).toHaveBeenCalledWith(
      "/auth/validateRecoveryPasswordCode",
      { email: "a@b.com", code: "123456" },
    );
  });

  it("changePassword envia o resetToken no payload", async () => {
    const api = (await import("@/lib/api")).default;
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    const { authService } = await import("@/services/auth.service");
    await authService.changePassword("a@b.com", "reset-tok-123", "NovaSenha@1");

    expect(api.post).toHaveBeenCalledWith("/auth/changePassword", {
      email: "a@b.com",
      resetToken: "reset-tok-123",
      password: "NovaSenha@1",
    });
  });

  it("authService.login NÃO deve armazenar access_token nem refresh_token no localStorage", async () => {
    // Mock the api post to return auth data
    const api = (await import("@/lib/api")).default;
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        user: { id: "1", name: "Test", email: "a@b.com", role: "admin" },
        access_token: "jwt-123",
        refresh_token: "rt-should-not-be-stored",
      },
    });

    const { authService } = await import("@/services/auth.service");
    await authService.login({ email: "a@b.com", password: "123" });

    // NÃO deve armazenar access_token nem refresh_token
    const allSetCalls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock
      .calls;
    const tokenCalls = allSetCalls.filter(
      (call: string[]) => call[0] === "access_token" || call[0] === "token",
    );
    const refreshCalls = allSetCalls.filter(
      (call: string[]) => call[0] === "refresh_token",
    );
    expect(tokenCalls).toHaveLength(0);
    expect(refreshCalls).toHaveLength(0);
  });
});
