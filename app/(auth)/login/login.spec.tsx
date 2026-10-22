import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import LoginPage from "./page";

const loginMock = vi.fn();
const completeMfaLoginMock = vi.fn();

function erroHttp(status: number, message: string) {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  });
}

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    completeMfaLogin: completeMfaLoginMock,
    loading: false,
    isAuthenticated: false,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue(undefined);
    completeMfaLoginMock.mockReset();
    completeMfaLoginMock.mockResolvedValue(undefined);
    window.history.replaceState({}, "", "/login");
  });

  it("envia credenciais via handler sem navegação GET na URL", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrar/i })).not.toBeDisabled();
    });

    await user.type(screen.getByLabelText(/e-mail/i), "medico@inexci.com");
    await user.type(screen.getByLabelText(/^senha/i), "Teste123@");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        "medico@inexci.com",
        "Teste123@",
      );
    });
    expect(window.location.search).toBe("");
  });

  async function entrarComMfa() {
    loginMock.mockResolvedValue({ mfaRequired: true, mfaToken: "mfa-token" });
    const user = userEvent.setup();
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrar/i })).not.toBeDisabled();
    });
    await user.type(screen.getByLabelText(/e-mail/i), "medico@inexci.com");
    await user.type(screen.getByLabelText(/^senha/i), "Teste123@");
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    await screen.findByText(/verificação em duas etapas/i);
    return user;
  }

  async function digitarCodigo(user: ReturnType<typeof userEvent.setup>, code: string) {
    await user.click(screen.getByLabelText("Dígito 1 de 6"));
    await user.keyboard(code);
  }

  it("com MFA ativo, pede o código e envia junto com o token da primeira etapa", async () => {
    const user = await entrarComMfa();

    expect(screen.queryByLabelText(/^senha/i)).not.toBeInTheDocument();
    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    await waitFor(() =>
      expect(completeMfaLoginMock).toHaveBeenCalledWith("mfa-token", "123456"),
    );
  });

  it("permite usar um código de recuperação", async () => {
    const user = await entrarComMfa();

    await user.click(
      screen.getByRole("button", { name: /usar código de recuperação/i }),
    );
    await user.type(
      screen.getByLabelText(/código de recuperação/i),
      "ABCDE-FGH23",
    );
    await user.click(screen.getByRole("button", { name: /verificar e entrar/i }));

    await waitFor(() =>
      expect(completeMfaLoginMock).toHaveBeenCalledWith(
        "mfa-token",
        "ABCDE-FGH23",
      ),
    );
  });

  it("a etapa de MFA troca o cabeçalho do login pelo da verificação", async () => {
    await entrarComMfa();

    expect(screen.queryByText(/bem-vindo de volta/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verificação em duas etapas" }),
    ).toBeInTheDocument();
  });

  it("o modo de recuperação tem tela própria, formata o código e permite voltar", async () => {
    const user = await entrarComMfa();

    await user.click(
      screen.getByRole("button", { name: /usar código de recuperação/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Entrar com código de recuperação" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Dígito 1 de 6")).not.toBeInTheDocument();
    expect(screen.getByText(/cada código vale uma única vez/i)).toBeInTheDocument();

    const campo = screen.getByLabelText(/código de recuperação/i);
    await user.type(campo, "abcdefgh23");
    expect(campo).toHaveValue("ABCDE-FGH23");

    await user.click(
      screen.getByRole("button", { name: /usar código do aplicativo/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Verificação em duas etapas" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Dígito 1 de 6")).toBeInTheDocument();
  });

  it("código inválido mostra o erro e mantém a etapa", async () => {
    completeMfaLoginMock.mockRejectedValue(
      erroHttp(400, "Código de verificação inválido."),
    );
    const user = await entrarComMfa();

    await digitarCodigo(user, "000000");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    expect(
      await screen.findByText("Código de verificação inválido."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verificar/i })).toBeInTheDocument();
  });

  it("bloqueio por tentativas mostra a mensagem do servidor", async () => {
    completeMfaLoginMock.mockRejectedValue(
      erroHttp(
        429,
        "Muitas tentativas com código inválido. Aguarde alguns minutos e tente novamente.",
      ),
    );
    const user = await entrarComMfa();

    await digitarCodigo(user, "000000");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it("etapa expirada oferece voltar ao login", async () => {
    completeMfaLoginMock.mockRejectedValue(
      erroHttp(401, "Sua verificação expirou. Entre com e-mail e senha novamente."),
    );
    const user = await entrarComMfa();

    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: /verificar/i }));

    await user.click(
      await screen.findByRole("button", { name: /voltar ao login/i }),
    );
    expect(screen.getByLabelText(/^senha/i)).toBeInTheDocument();
  });
});
