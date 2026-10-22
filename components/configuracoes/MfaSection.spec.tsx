import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";

const { setupMock, enableMock, disableMock, regenerateMock, authState } =
  vi.hoisted(() => ({
    setupMock: vi.fn(),
    enableMock: vi.fn(),
    disableMock: vi.fn(),
    regenerateMock: vi.fn(),
    authState: {
      user: {
        id: "u-1",
        email: "medico@inexci.com",
        mfaEnabled: false,
        mfaRecommended: false,
      } as Record<string, unknown>,
      updateUser: vi.fn(),
    },
  }));

vi.mock("@/services/mfa.service", () => ({
  mfaService: {
    setup: (...args: unknown[]) => setupMock(...args),
    enable: (...args: unknown[]) => enableMock(...args),
    disable: (...args: unknown[]) => disableMock(...args),
    regenerateRecoveryCodes: (...args: unknown[]) => regenerateMock(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import { MfaSection } from "./MfaSection";

const CODIGOS = Array.from({ length: 10 }, (_, i) =>
  `AAAA${i}-BBBB${i}`.replace(/[01]/g, "2"),
);

function erroHttp(status: number, message: string) {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  });
}

async function digitarCodigo(
  user: ReturnType<typeof userEvent.setup>,
  code: string,
) {
  await user.click(screen.getByLabelText("Dígito 1 de 6"));
  await user.keyboard(code);
}

describe("MfaSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = {
      id: "u-1",
      email: "medico@inexci.com",
      mfaEnabled: false,
      mfaRecommended: false,
    };
    setupMock.mockResolvedValue({
      secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      formattedSecret: "JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP",
      otpauthUri:
        "otpauth://totp/Inexci:medico%40inexci.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Inexci",
    });
    enableMock.mockResolvedValue({ recoveryCodes: CODIGOS });
    disableMock.mockResolvedValue(undefined);
    regenerateMock.mockResolvedValue({ recoveryCodes: CODIGOS });
  });

  it("mostra aviso discreto quando o MFA é recomendado", () => {
    authState.user = { ...authState.user, mfaRecommended: true };
    render(<MfaSection showToast={vi.fn()} />);
    expect(screen.getByTestId("mfa-recommended")).toBeInTheDocument();
  });

  it("sem recomendação não mostra o aviso", () => {
    render(<MfaSection showToast={vi.fn()} />);
    expect(screen.queryByTestId("mfa-recommended")).not.toBeInTheDocument();
    expect(screen.getByText("Desativada")).toBeInTheDocument();
  });

  it("ativação: mostra a chave e o link otpauth, confirma o código e exibe os 10 códigos uma vez", async () => {
    const showToast = vi.fn();
    const user = userEvent.setup();
    render(<MfaSection showToast={showToast} />);

    await user.click(
      screen.getByRole("button", {
        name: /ativar verificação em duas etapas/i,
      }),
    );

    const segredo = await screen.findByTestId("mfa-secret");
    const alternativa = segredo.closest("details");
    expect(alternativa).not.toHaveAttribute("open");
    await user.click(screen.getByText(/não consegue ler o qr code\?/i));
    expect(alternativa).toHaveAttribute("open");

    expect(segredo).toHaveTextContent("JBSW Y3DP EHPK 3PXP");
    expect(
      screen.getByRole("link", { name: /abrir no aplicativo autenticador/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^otpauth:\/\/totp\//));

    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: /^ativar$/i }));

    await waitFor(() => expect(enableMock).toHaveBeenCalledWith("123456"));
    const lista = await screen.findByRole("list", {
      name: /códigos de recuperação/i,
    });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(10);
    expect(authState.updateUser).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "Verificação em duas etapas ativada.",
      "success",
    );

    const concluir = screen.getByRole("button", { name: /concluir/i });
    expect(concluir).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /guardei os códigos de recuperação/i,
      }),
    );
    expect(concluir).not.toBeDisabled();
  });

  it("ativação mostra o QR code gerado no navegador, sem enviar o segredo a terceiros", async () => {
    const user = userEvent.setup();
    render(<MfaSection showToast={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: /ativar verificação em duas etapas/i,
      }),
    );

    const qr = await screen.findByTestId("mfa-qrcode");
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(
      screen.getByRole("img", {
        name: /qr code para configurar o aplicativo autenticador/i,
      }),
    ).toBe(qr);
    expect(qr.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(document.querySelector('img[src^="http"]')).toBeNull();
  });

  it("ativação com código errado mostra o erro e não exibe códigos", async () => {
    enableMock.mockRejectedValue(
      erroHttp(400, "Código de verificação inválido."),
    );
    const user = userEvent.setup();
    render(<MfaSection showToast={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: /ativar verificação em duas etapas/i,
      }),
    );
    await screen.findByTestId("mfa-secret");
    await digitarCodigo(user, "000000");
    await user.click(screen.getByRole("button", { name: /^ativar$/i }));

    expect(
      await screen.findByText("Código de verificação inválido."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: /códigos de recuperação/i }),
    ).not.toBeInTheDocument();
  });

  it("copia os códigos para a área de transferência", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<MfaSection showToast={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: /ativar verificação em duas etapas/i,
      }),
    );
    await screen.findByTestId("mfa-secret");
    await digitarCodigo(user, "123456");
    await user.click(screen.getByRole("button", { name: /^ativar$/i }));
    await user.click(
      await screen.findByRole("button", { name: /copiar códigos/i }),
    );

    expect(writeText).toHaveBeenCalledWith(CODIGOS.join("\n"));
    expect(
      await screen.findByRole("button", { name: /copiados/i }),
    ).toBeInTheDocument();
  });

  it("desativação exige senha e código e avisa que as outras sessões caíram", async () => {
    authState.user = { ...authState.user, mfaEnabled: true };
    const showToast = vi.fn();
    const user = userEvent.setup();
    render(<MfaSection showToast={showToast} />);

    expect(screen.getByText("Ativa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^desativar$/i }));
    const dialog = await screen.findByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: /^desativar$/i }),
    );
    expect(disableMock).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/senha atual/i), "Senha123@");
    await user.type(
      within(dialog).getByLabelText(/código do aplicativo ou de recuperação/i),
      "ABCDE-FGH23",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /^desativar$/i }),
    );

    await waitFor(() =>
      expect(disableMock).toHaveBeenCalledWith("Senha123@", "ABCDE-FGH23"),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("outras sessões foram encerradas"),
      "success",
    );
    expect(authState.updateUser).toHaveBeenCalled();
  });

  it("desativação com senha errada mostra o erro do servidor", async () => {
    authState.user = { ...authState.user, mfaEnabled: true };
    disableMock.mockRejectedValue(erroHttp(400, "Senha atual incorreta"));
    const user = userEvent.setup();
    render(<MfaSection showToast={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^desativar$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/senha atual/i), "errada");
    await user.type(
      within(dialog).getByLabelText(/código do aplicativo ou de recuperação/i),
      "123456",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /^desativar$/i }),
    );

    expect(
      await within(dialog).findByText("Senha atual incorreta"),
    ).toBeInTheDocument();
  });

  it("regenera os códigos de recuperação com o código do aplicativo", async () => {
    authState.user = { ...authState.user, mfaEnabled: true };
    const user = userEvent.setup();
    render(<MfaSection showToast={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: /gerar novos códigos de recuperação/i,
      }),
    );
    await screen.findByRole("dialog");
    await digitarCodigo(user, "654321");
    await user.click(
      screen.getByRole("button", { name: /^gerar novos códigos$/i }),
    );

    await waitFor(() => expect(regenerateMock).toHaveBeenCalledWith("654321"));
    expect(
      await screen.findByText(/os códigos anteriores deixaram de valer/i),
    ).toBeInTheDocument();
  });

  it("ativa: mostra a linha de códigos de recuperação e o desativar sem destaque de perigo", () => {
    authState.user = { ...authState.user, mfaEnabled: true };
    render(<MfaSection showToast={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Códigos de recuperação" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Gerar novos códigos de recuperação",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /ativar verificação em duas etapas/i,
      }),
    ).toBeNull();
  });

  it("desativada: não mostra a linha de códigos de recuperação", () => {
    render(<MfaSection showToast={vi.fn()} />);
    expect(
      screen.queryByRole("heading", { name: "Códigos de recuperação" }),
    ).toBeNull();
  });
});
