import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authMe = vi.fn();
const authLogin = vi.fn();
const authLoginMfa = vi.fn();
const routerPush = vi.fn();
const broadcastAuthEvent = vi.fn();

vi.mock("@/services/auth.service", () => ({
  authService: {
    me: (...args: unknown[]) => authMe(...args),
    logout: vi.fn(),
    login: (...args: unknown[]) => authLogin(...args),
    loginMfa: (...args: unknown[]) => authLoginMfa(...args),
    getCurrentUser: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("@/services/consent.service", () => ({
  consentService: { getStatus: vi.fn().mockResolvedValue(null) },
}));

vi.mock("@/services/billing.service", () => ({
  billingService: { getMySubscription: vi.fn().mockResolvedValue(null) },
}));

vi.mock("@/lib/api", () => ({
  default: {},
  refreshSession: vi.fn(),
  isSessaoExpirada: vi.fn(() => false),
}));

vi.mock("@/lib/auth-token", () => ({
  getAccessToken: vi.fn().mockReturnValue(null),
  clearAccessToken: vi.fn(),
}));

vi.mock("@/lib/session-flag", () => ({
  SESSION_FLAG_KEY: "had_session",
  hasSessionHint: vi.fn().mockReturnValue(false),
  clearSessionFlag: vi.fn(),
}));

vi.mock("@/lib/auth-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-sync")>();
  return {
    ...actual,
    hardNavigate: vi.fn(),
    hardReload: vi.fn(),
    broadcastAuthEvent: (...args: unknown[]) => broadcastAuthEvent(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
}));

import { AuthProvider, useAuth } from "../AuthContext";

let auth: ReturnType<typeof useAuth> | null = null;

function Probe() {
  auth = useAuth();
  return null;
}

function renderAuth() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const usuario = {
  id: "u-1",
  name: "Ana",
  email: "ana@x.com",
  role: "collaborator",
  permissions: ["agenda"],
  consents: { pendingRequired: [] },
};

describe("AuthContext — login com MFA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = null;
    authMe.mockRejectedValue(new Error("sem sessão"));
  });

  it("primeira etapa com MFA devolve o desafio sem abrir sessão nem navegar", async () => {
    renderAuth();
    await waitFor(() => expect(auth?.loading).toBe(false));
    authLogin.mockResolvedValue({ mfaRequired: true, mfaToken: "mfa-token" });

    let outcome: Awaited<ReturnType<NonNullable<typeof auth>["login"]>> | null =
      null;
    await act(async () => {
      outcome = await auth!.login("ana@x.com", "x");
    });

    expect(outcome).toEqual({ mfaRequired: true, mfaToken: "mfa-token" });
    expect(auth!.user).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
    expect(broadcastAuthEvent).not.toHaveBeenCalled();
  });

  it("segunda etapa conclui o login como o login normal", async () => {
    renderAuth();
    await waitFor(() => expect(auth?.loading).toBe(false));
    authLoginMfa.mockResolvedValue({ access_token: "jwt", user: usuario });

    await act(async () => {
      await auth!.completeMfaLogin("mfa-token", "123456");
    });

    expect(authLoginMfa).toHaveBeenCalledWith("mfa-token", "123456");
    expect(auth!.user?.id).toBe("u-1");
    expect(broadcastAuthEvent).toHaveBeenCalledWith({
      type: "login",
      userId: "u-1",
    });
    expect(routerPush).toHaveBeenCalledWith("/agenda");
  });

  it("login sem MFA informa mfaRequired false", async () => {
    renderAuth();
    await waitFor(() => expect(auth?.loading).toBe(false));
    authLogin.mockResolvedValue({ access_token: "jwt", user: usuario });

    let outcome: unknown = null;
    await act(async () => {
      outcome = await auth!.login("ana@x.com", "x");
    });

    expect(outcome).toEqual({ mfaRequired: false });
    expect(auth!.user?.id).toBe("u-1");
  });
});
