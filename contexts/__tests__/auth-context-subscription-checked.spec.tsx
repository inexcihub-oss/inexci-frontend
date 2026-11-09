import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";

const authLogin = vi.fn();
const getMySubscription = vi.fn();

vi.mock("@/services/auth.service", () => ({
  authService: {
    me: vi.fn(),
    logout: vi.fn(),
    login: (...args: unknown[]) => authLogin(...args),
    loginMfa: vi.fn(),
    getCurrentUser: vi.fn().mockReturnValue(null),
  },
}));
vi.mock("@/services/consent.service", () => ({
  consentService: { getStatus: vi.fn().mockResolvedValue(null) },
}));
vi.mock("@/services/billing.service", () => ({
  billingService: {
    getMySubscription: (...args: unknown[]) => getMySubscription(...args),
  },
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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { AuthProvider, useAuth } from "../AuthContext";

let auth: ReturnType<typeof useAuth> | null = null;

function Probe() {
  auth = useAuth();
  return null;
}

const usuario = {
  id: "u-1",
  name: "Ana",
  email: "ana@x.com",
  role: "admin",
  accountId: "u-1",
  permissions: ["agenda"],
  consents: { pendingRequired: [] },
};

function erroHttp(status: number) {
  return new AxiosError("falhou", "ERR", undefined, undefined, {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: {} as never,
  });
}

async function entrar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(auth?.loading).toBe(false));
  authLogin.mockResolvedValue({ user: usuario });
  await act(async () => {
    await auth!.login("a@x.com", "senha");
  });
}

describe("AuthContext — subscriptionChecked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = null;
  });

  it("fica verdadeiro quando a API responde que não há assinatura (404)", async () => {
    getMySubscription.mockRejectedValue(erroHttp(404));
    await entrar();

    await waitFor(() => expect(auth?.subscriptionChecked).toBe(true));
    expect(auth?.subscription).toBeNull();
  });

  it("não fica verdadeiro em erro genérico, para não confundir falha com ausência", async () => {
    getMySubscription.mockRejectedValue(erroHttp(500));
    await entrar();

    await waitFor(() => expect(getMySubscription).toHaveBeenCalled());
    await waitFor(() => expect(auth?.subscriptionLoading).toBe(false));
    expect(auth?.subscriptionChecked).toBe(false);
  });

  it("não fica verdadeiro em erro de rede sem resposta", async () => {
    getMySubscription.mockRejectedValue(new Error("Network Error"));
    await entrar();

    await waitFor(() => expect(auth?.subscriptionLoading).toBe(false));
    expect(auth?.subscriptionChecked).toBe(false);
  });

  it("fica verdadeiro quando a assinatura carrega", async () => {
    getMySubscription.mockResolvedValue({
      subscription: { status: "active" },
      quota: null,
    });
    await entrar();

    await waitFor(() => expect(auth?.subscriptionChecked).toBe(true));
    expect(auth?.subscription).not.toBeNull();
  });
});
