import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { loginMock, pushMock, validateMock, changeMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  validateMock: vi.fn(),
  changeMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    validateRecoveryCode: (...args: unknown[]) => validateMock(...args),
    changePassword: (...args: unknown[]) => changeMock(...args),
  },
}));

import PrimeiroAcessoPage from "./page";

async function ativarConta() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<PrimeiroAcessoPage />);
  const [senha, confirmacao] = await waitFor(() => {
    const campos = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[type=password]"),
    );
    expect(campos).toHaveLength(2);
    return campos;
  });
  await user.type(senha, "SenhaForte123@");
  await user.type(confirmacao, "SenhaForte123@");
  await user.click(screen.getByRole("button", { name: /ativar conta/i }));
}

describe("PrimeiroAcessoPage — conta com MFA", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    window.history.replaceState(
      {},
      "",
      "/primeiro-acesso#email=a%40b.com&token=123456",
    );
    validateMock.mockResolvedValue("reset-token");
    changeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("se o login pedir a segunda etapa, manda para a tela de login", async () => {
    loginMock.mockResolvedValue({ mfaRequired: true, mfaToken: "t" });

    await ativarConta();

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith("a@b.com", "SenhaForte123@"),
    );
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("sem MFA, o login segue normalmente e não volta para /login", async () => {
    loginMock.mockResolvedValue({ mfaRequired: false });

    await ativarConta();

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(pushMock).not.toHaveBeenCalledWith("/login");
  });
});
