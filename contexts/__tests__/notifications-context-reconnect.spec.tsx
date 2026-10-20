import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const { handlers, connectMock, refreshSessionMock, ioMock, tokenAtual } =
  vi.hoisted(() => ({
    handlers: {} as Record<string, (payload: unknown) => void>,
    connectMock: vi.fn(),
    refreshSessionMock: vi.fn(),
    ioMock: vi.fn(),
    tokenAtual: { valor: "token-1" },
  }));

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => {
    ioMock(...args);
    return {
      on: (event: string, handler: (payload: unknown) => void) => {
        handlers[event] = handler;
      },
      connect: connectMock,
      disconnect: vi.fn(),
    };
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1" } }),
}));

vi.mock("@/lib/auth-token", () => ({
  getAccessToken: () => tokenAtual.valor,
}));

vi.mock("@/lib/api", () => ({
  refreshSession: () => refreshSessionMock(),
}));

vi.mock("@/services/notification.service", () => ({
  notificationService: { markAsRead: vi.fn().mockResolvedValue(undefined) },
}));

import { NotificationsProvider } from "../NotificationsContext";

describe("NotificationsContext — sessão do socket", () => {
  const originalUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenAtual.valor = "token-1";
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalUrl;
  });

  function montar() {
    render(
      <NotificationsProvider>
        <div />
      </NotificationsProvider>,
    );
  }

  it("envia sempre o access token atual no handshake", () => {
    montar();

    const opcoes = ioMock.mock.calls[0][1] as {
      auth: (cb: (dados: { token: string }) => void) => void;
    };
    tokenAtual.valor = "token-renovado";
    const cb = vi.fn();
    opcoes.auth(cb);

    expect(cb).toHaveBeenCalledWith({ token: "token-renovado" });
  });

  it("quando o servidor derruba o socket (token expirado), renova a sessão e reconecta", async () => {
    refreshSessionMock.mockResolvedValue("token-2");
    montar();

    handlers["disconnect"]("io server disconnect");

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
  });

  it("não reconecta se a renovação falhar (sessão revogada)", async () => {
    refreshSessionMock.mockRejectedValue(new Error("401"));
    montar();

    handlers["disconnect"]("io server disconnect");

    await waitFor(() => expect(refreshSessionMock).toHaveBeenCalled());
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("limita as reconexões pedidas pelo servidor para não entrar em loop", async () => {
    refreshSessionMock.mockResolvedValue("token-2");
    montar();

    for (let i = 0; i < 5; i++) {
      handlers["disconnect"]("io server disconnect");
      await waitFor(() =>
        expect(refreshSessionMock).toHaveBeenCalledTimes(Math.min(i + 1, 3)),
      );
    }

    expect(refreshSessionMock).toHaveBeenCalledTimes(3);
  });

  it("queda de rede fica com a reconexão automática do socket.io", () => {
    montar();

    handlers["disconnect"]("transport close");

    expect(refreshSessionMock).not.toHaveBeenCalled();
  });
});
