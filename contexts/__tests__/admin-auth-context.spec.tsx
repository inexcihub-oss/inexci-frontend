import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  refresh: vi.fn(),
  login: vi.fn(),
  verifyMfa: vi.fn(),
  setupMfa: vi.fn(),
  enableMfa: vi.fn(),
  logout: vi.fn(),
}));
const replace = vi.hoisted(() => vi.fn());
const expired = vi.hoisted(() => ({ listener: null as null | (() => void) }));

vi.mock("@/services/admin-auth.service", () => ({ adminAuthService: svc }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({
  clearAdminAccessToken: vi.fn(),
  onAdminSessionExpired: (listener: () => void) => {
    expired.listener = listener;
    return () => {
      expired.listener = null;
    };
  },
}));

import { AdminAuthProvider, useAdminAuth } from "../AdminAuthContext";

const admin = {
  id: "a-1",
  name: "Ana",
  email: "ana@inexci.com",
  mfaEnabled: true,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <TestProviders queryClient={createTestQueryClient()}>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </TestProviders>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.refresh.mockRejectedValue(new Error("sem sessão"));
});

describe("AdminAuthContext", () => {
  it("restaura a sessão pelo refresh ao montar", async () => {
    svc.refresh.mockResolvedValue({ accessToken: "t", admin });
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.admin).toEqual(admin);
    expect(svc.refresh).toHaveBeenCalledTimes(1);
  });

  it("sem cookie de refresh termina sem admin", async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.admin).toBeNull();
  });

  it("login devolve a etapa sem abrir sessão; o código abre", async () => {
    svc.login.mockResolvedValue({ step: "mfa", mfaToken: "m" });
    svc.verifyMfa.mockResolvedValue({ accessToken: "t", admin });
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let etapa: unknown;
    await act(async () => {
      etapa = await result.current.login("ana@inexci.com", "x");
    });
    expect(etapa).toEqual({ step: "mfa", mfaToken: "m" });
    expect(result.current.admin).toBeNull();

    await act(async () => {
      await result.current.verifyMfa("m", "123456");
    });
    expect(svc.verifyMfa).toHaveBeenCalledWith("m", "123456");
    expect(result.current.admin).toEqual(admin);
  });

  it("cadastro do MFA devolve os códigos de recuperação e abre a sessão", async () => {
    svc.setupMfa.mockResolvedValue({
      secret: "S",
      formattedSecret: "S S",
      otpauthUri: "otpauth://x",
    });
    svc.enableMfa.mockResolvedValue({
      accessToken: "t",
      admin,
      recoveryCodes: ["AAAAA-BBBBB"],
    });
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startMfaSetup("setup");
    });
    expect(svc.setupMfa).toHaveBeenCalledWith("setup");

    let codes: string[] = [];
    const recebidos: string[][] = [];
    await act(async () => {
      codes = await result.current.enableMfa("setup", "123456", (c) => {
        recebidos.push(c);
        expect(result.current.admin).toBeNull();
      });
    });
    expect(codes).toEqual(["AAAAA-BBBBB"]);
    expect(recebidos).toEqual([["AAAAA-BBBBB"]]);
    expect(result.current.admin).toEqual(admin);
  });

  it("logout encerra a sessão e volta para o login do painel", async () => {
    svc.refresh.mockResolvedValue({ accessToken: "t", admin });
    svc.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    await waitFor(() => expect(result.current.admin).toEqual(admin));

    await act(async () => {
      await result.current.logout();
    });

    expect(svc.logout).toHaveBeenCalledTimes(1);
    expect(result.current.admin).toBeNull();
    expect(replace).toHaveBeenCalledWith("/admin/login");
  });

  it("sessão expirada no cliente zera o admin", async () => {
    svc.refresh.mockResolvedValue({ accessToken: "t", admin });
    const { result } = renderHook(() => useAdminAuth(), { wrapper });
    await waitFor(() => expect(result.current.admin).toEqual(admin));

    act(() => expired.listener?.());

    expect(result.current.admin).toBeNull();
  });
});
