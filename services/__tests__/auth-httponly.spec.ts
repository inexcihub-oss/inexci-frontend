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

describe("Auth — refresh_token não deve estar no localStorage", () => {
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

    localStorage.setItem("token", "test-token");
    localStorage.setItem("user", JSON.stringify({ id: "1", email: "a@b.com" }));

    await authService.logout();

    // Deve remover token e user
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token_timestamp");

    // NÃO deve tentar remover refresh_token
    expect(localStorage.removeItem).not.toHaveBeenCalledWith("refresh_token");
  });

  it("authService.login NÃO deve armazenar refresh_token no localStorage", async () => {
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

    // Deve armazenar token e user
    expect(localStorage.setItem).toHaveBeenCalledWith("token", "jwt-123");

    // NÃO deve armazenar refresh_token
    const allSetCalls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock
      .calls;
    const refreshCalls = allSetCalls.filter(
      (call: string[]) => call[0] === "refresh_token",
    );
    expect(refreshCalls).toHaveLength(0);
  });
});
