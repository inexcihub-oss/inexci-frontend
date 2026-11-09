import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const replace = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  admin: null as null | { id: string; name: string; email: string },
  loading: false,
  login: vi.fn(),
  verifyMfa: vi.fn(),
  startMfaSetup: vi.fn(),
  enableMfa: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/contexts/AdminAuthContext", () => ({ useAdminAuth: () => auth }));

import { AdminLoginFlow } from "./AdminLoginFlow";

function erroHttp(status: number, message?: string) {
  return new AxiosError("erro", "ERR", undefined, null, {
    status,
    data: message ? { message } : {},
  } as never);
}

async function entrar(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^e-mail/i), "Ana@Inexci.com");
  await user.type(screen.getByLabelText(/^senha/i), "Senha123@");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

async function digitarCodigo(
  user: ReturnType<typeof userEvent.setup>,
  code: string,
) {
  await user.click(screen.getByLabelText("Dígito 1 de 6"));
  await user.keyboard(code);
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.admin = null;
  auth.loading = false;
  window.history.replaceState({}, "", "/admin/login");
});

describe("AdminLoginFlow", () => {
  it("e-mail e senha levam ao código do autenticador", async () => {
    auth.login.mockResolvedValue({ step: "mfa", mfaToken: "mfa-1" });
    auth.verifyMfa.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);

    await entrar(user);

    expect(auth.login).toHaveBeenCalledWith("ana@inexci.com", "Senha123@");
    expect(
      await screen.findByRole("heading", {
        name: "Verificação em duas etapas",
      }),
    ).toBeInTheDocument();
    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: "Verificar" }));

    expect(auth.verifyMfa).toHaveBeenCalledWith("mfa-1", "123456");
  });

  it("aceita código de recuperação", async () => {
    auth.login.mockResolvedValue({ step: "mfa", mfaToken: "mfa-1" });
    auth.verifyMfa.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    await user.click(
      await screen.findByRole("button", { name: "Usar código de recuperação" }),
    );
    const campo = screen.getByLabelText("Código de recuperação");
    await user.type(campo, "abcdefgh23");
    expect(campo).toHaveValue("ABCDE-FGH23");
    await user.click(
      screen.getByRole("button", { name: "Verificar e entrar" }),
    );

    expect(auth.verifyMfa).toHaveBeenCalledWith("mfa-1", "ABCDE-FGH23");
  });

  it("código errado mostra o erro e mantém a etapa", async () => {
    auth.login.mockResolvedValue({ step: "mfa", mfaToken: "mfa-1" });
    auth.verifyMfa.mockRejectedValue(erroHttp(400, "Código inválido"));
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    await digitarCodigo(user, "000000");
    await user.click(screen.getByRole("button", { name: "Verificar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Código inválido",
    );
    expect(
      screen.getByRole("heading", { name: "Verificação em duas etapas" }),
    ).toBeInTheDocument();
  });

  it("etapa expirada (401) volta ao início com aviso", async () => {
    auth.login.mockResolvedValue({ step: "mfa", mfaToken: "mfa-1" });
    auth.verifyMfa.mockRejectedValue(erroHttp(401));
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: "Verificar" }));

    expect(await screen.findByLabelText(/^e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /etapa de verificação expirou/,
    );
  });

  it("credenciais erradas mostram a mensagem da API", async () => {
    auth.login.mockRejectedValue(erroHttp(401, "E-mail ou senha inválidos"));
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha inválidos",
    );
    expect(screen.getByLabelText(/^senha/i)).toHaveValue("");
  });

  it("excesso de tentativas avisa para aguardar", async () => {
    auth.login.mockRejectedValue(erroHttp(429));
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Muitas tentativas/,
    );
  });

  it("primeiro acesso cadastra o MFA e mostra os códigos de recuperação", async () => {
    auth.login.mockResolvedValue({ step: "mfa_setup", setupToken: "setup-1" });
    auth.startMfaSetup.mockResolvedValue({
      secret: "JBSWY3DPEHPK3PXP",
      formattedSecret: "JBSW Y3DP EHPK 3PXP",
      otpauthUri: "otpauth://totp/Inexci:ana?secret=JBSWY3DPEHPK3PXP",
    });
    auth.enableMfa.mockImplementation(
      async (
        _setupToken: string,
        _code: string,
        onRecoveryCodes?: (codes: string[]) => void,
      ) => {
        const codes = ["AAAAA-BBBBB", "CCCCC-DDDDD"];
        onRecoveryCodes?.(codes);
        return codes;
      },
    );
    window.history.replaceState({}, "", "/admin/login?next=%2Fadmin%2Fuso");
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    expect(await screen.findByTestId("admin-mfa-qrcode")).toBeInTheDocument();
    expect(auth.startMfaSetup).toHaveBeenCalledWith("setup-1");
    expect(screen.getByTestId("admin-mfa-secret")).toHaveTextContent(
      "JBSW Y3DP EHPK 3PXP",
    );

    await digitarCodigo(user, "654321");
    await user.click(
      screen.getByRole("button", { name: "Ativar verificação" }),
    );

    expect(auth.enableMfa).toHaveBeenCalledWith(
      "setup-1",
      "654321",
      expect.any(Function),
    );
    expect(await screen.findByText("AAAAA-BBBBB")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copiar códigos/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar/ })).toBeInTheDocument();

    const entrarNoPainel = screen.getByRole("button", {
      name: "Entrar no painel",
    });
    expect(entrarNoPainel).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: "Guardei os códigos de recuperação",
      }),
    );
    await user.click(entrarNoPainel);

    expect(replace).toHaveBeenCalledWith("/admin/uso");
  });

  it("cadastro do MFA com token vencido volta ao início", async () => {
    auth.login.mockResolvedValue({ step: "mfa_setup", setupToken: "setup-1" });
    auth.startMfaSetup.mockRejectedValue(erroHttp(401));
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginFlow />);
    await entrar(user);

    expect(await screen.findByRole("status")).toHaveTextContent(
      /etapa de verificação expirou/,
    );
    expect(screen.getByLabelText(/^e-mail/i)).toBeInTheDocument();
  });

  it("logado vai para o next interno", async () => {
    auth.admin = { id: "a-1", name: "Ana", email: "ana@inexci.com" };
    window.history.replaceState(
      {},
      "",
      "/admin/login?next=%2Fadmin%2Fclientes%3Fsituacao%3Dtrial",
    );
    renderWithProviders(<AdminLoginFlow />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/clientes?situacao=trial"),
    );
  });

  it("logado com next externo vai para o dashboard", async () => {
    auth.admin = { id: "a-1", name: "Ana", email: "ana@inexci.com" };
    window.history.replaceState(
      {},
      "",
      "/admin/login?next=https%3A%2F%2Fevil.com",
    );
    renderWithProviders(<AdminLoginFlow />);

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace).toHaveBeenLastCalledWith("/admin/dashboard");
    expect(replace).not.toHaveBeenCalledWith("https://evil.com");
  });

  it("mostra o aviso de convite aceito", async () => {
    window.history.replaceState({}, "", "/admin/login?convite=aceito");
    renderWithProviders(<AdminLoginFlow />);

    expect(await screen.findByRole("status")).toHaveTextContent(/Senha criada/);
    expect(window.location.search).toBe("");
  });
});
