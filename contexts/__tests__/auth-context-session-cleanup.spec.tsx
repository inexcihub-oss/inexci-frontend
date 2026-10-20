import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authMe = vi.fn();
const authLogout = vi.fn();
const authLogin = vi.fn();
const getCurrentUser = vi.fn();
const hardNavigate = vi.fn();
const hardReload = vi.fn();
const broadcastAuthEvent = vi.fn();

vi.mock("@/services/auth.service", () => ({
  authService: {
    me: (...args: unknown[]) => authMe(...args),
    logout: (...args: unknown[]) => authLogout(...args),
    login: (...args: unknown[]) => authLogin(...args),
    getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
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
  getAccessToken: vi.fn().mockReturnValue("token"),
  clearAccessToken: vi.fn(),
}));

vi.mock("@/lib/session-flag", () => ({
  SESSION_FLAG_KEY: "had_session",
  hasSessionHint: vi.fn().mockReturnValue(true),
  clearSessionFlag: vi.fn(),
}));

vi.mock("@/lib/auth-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-sync")>();
  return {
    ...actual,
    hardNavigate: (...args: unknown[]) => hardNavigate(...args),
    hardReload: (...args: unknown[]) => hardReload(...args),
    broadcastAuthEvent: (...args: unknown[]) => broadcastAuthEvent(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { AuthProvider, useAuth } from "../AuthContext";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  readScFromDocumentHandoff,
  saveScFromDocumentHandoff,
} from "@/lib/sc-from-document-background";
import { criarExtracaoDemo } from "@/lib/onboarding/demo-data";

const usuario = {
  id: "u-1",
  name: "Ana",
  email: "ana@x.com",
  role: "collaborator",
  consents: { pendingRequired: [] },
};

let auth: ReturnType<typeof useAuth> | null = null;

function Probe() {
  auth = useAuth();
  return <div data-testid="user">{auth.user?.id ?? "none"}</div>;
}

function renderAuth() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["patients"], [{ name: "Paciente sigiloso" }]);
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

function dispararEventoDeOutraAba(value: object) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "auth_event",
        newValue: JSON.stringify(value),
      }),
    );
  });
}

describe("AuthContext — limpeza de sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth = null;
    getCurrentUser.mockReturnValue(null);
    authMe.mockResolvedValue(usuario);
    authLogout.mockResolvedValue(undefined);
  });

  it("logout limpa o cache do TanStack Query, o handoff da SC e faz navegação dura", async () => {
    const queryClient = renderAuth();
    await screen.findByText("u-1");
    saveScFromDocumentHandoff({
      result: criarExtracaoDemo(),
      userId: "u-1",
      jobId: "job-1",
    });

    await act(async () => {
      await auth!.logout();
    });

    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(readScFromDocumentHandoff("u-1")).toBeNull();
    expect(broadcastAuthEvent).toHaveBeenCalledWith({ type: "logout" });
    expect(hardNavigate).toHaveBeenCalledWith("/login");
    expect(screen.getByTestId("user").textContent).toBe("none");
  });

  it("troca de usuário na carga inicial limpa o cache e volta ao login", async () => {
    getCurrentUser.mockReturnValue({ id: "outro" });
    const queryClient = renderAuth();

    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith("/login"));
    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(screen.getByTestId("user").textContent).toBe("none");
  });

  it("logout em outra aba derruba a sessão desta", async () => {
    const queryClient = renderAuth();
    await screen.findByText("u-1");

    dispararEventoDeOutraAba({ type: "logout" });

    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(hardNavigate).toHaveBeenCalledWith("/login");
  });

  it("login de outro usuário em outra aba recarrega esta", async () => {
    const queryClient = renderAuth();
    await screen.findByText("u-1");

    dispararEventoDeOutraAba({ type: "login", userId: "u-2" });

    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(hardReload).toHaveBeenCalled();
  });

  it("login do mesmo usuário em outra aba não faz nada", async () => {
    const queryClient = renderAuth();
    await screen.findByText("u-1");

    dispararEventoDeOutraAba({ type: "login", userId: "u-1" });

    expect(hardReload).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["patients"])).toBeDefined();
  });

  it("login limpa o cache anterior e avisa as outras abas", async () => {
    getCurrentUser.mockReturnValue(null);
    authMe.mockRejectedValue(new Error("sem sessão"));
    const queryClient = renderAuth();
    await waitFor(() => expect(auth?.loading).toBe(false));
    queryClient.setQueryData(["patients"], [{ name: "Paciente sigiloso" }]);
    authLogin.mockResolvedValue({ user: { ...usuario, id: "u-3" } });

    await act(async () => {
      await auth!.login("a@b.com", "x");
    });

    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(broadcastAuthEvent).toHaveBeenCalledWith({
      type: "login",
      userId: "u-3",
    });
  });
});
