import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updatePasswordMock, loginMock } = vi.hoisted(() => ({
  updatePasswordMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    updatePassword: (...args: unknown[]) => updatePasswordMock(...args),
    login: (...args: unknown[]) => loginMock(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1", email: "medico@inexci.com" },
    updateUser: vi.fn(),
  }),
}));

import { SecurityTab } from "./SecurityTab";

async function trocarSenha() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /alterar senha/i }));
  await screen.findByRole("dialog");
  const [atual, nova, confirmacao] = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[type=password]"),
  );
  await user.type(atual, "Atual123@");
  await user.type(nova, "NovaSenha123@");
  await user.type(confirmacao, "NovaSenha123@");
  await user.click(screen.getByRole("button", { name: /salvar nova senha/i }));
}

describe("SecurityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePasswordMock.mockResolvedValue(undefined);
  });

  it("depois de trocar a senha abre uma sessão nova com a senha nova", async () => {
    loginMock.mockResolvedValue({});
    const showToast = vi.fn();
    render(<SecurityTab showToast={showToast} />);

    await trocarSenha();

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        email: "medico@inexci.com",
        password: "NovaSenha123@",
      }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("outras sessões foram encerradas"),
      "success",
    );
  });

  it("se não conseguir renovar a sessão, pede para entrar de novo", async () => {
    loginMock.mockRejectedValue(new Error("429"));
    const showToast = vi.fn();
    render(<SecurityTab showToast={showToast} />);

    await trocarSenha();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Faça login novamente"),
        "success",
      ),
    );
  });

  it("com MFA ativo não dá para renovar só com a senha: pede para entrar de novo", async () => {
    loginMock.mockResolvedValue({ mfaRequired: true, mfaToken: "t" });
    const showToast = vi.fn();
    render(<SecurityTab showToast={showToast} />);

    await trocarSenha();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Faça login novamente"),
        "success",
      ),
    );
  });

  it("mostra a seção de verificação em duas etapas", () => {
    render(<SecurityTab showToast={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: /verificação em duas etapas/i }),
    ).toBeInTheDocument();
  });

  it("a troca de senha fica fechada até ser pedida e o modal fecha ao salvar", async () => {
    loginMock.mockResolvedValue({});
    render(<SecurityTab showToast={vi.fn()} />);

    expect(document.querySelectorAll("input[type=password]")).toHaveLength(0);

    await trocarSenha();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(updatePasswordMock).toHaveBeenCalledWith(
      "Atual123@",
      "NovaSenha123@",
    );
  });
});
