import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";

const replace = vi.hoisted(() => vi.fn());
const svc = vi.hoisted(() => ({ acceptInvite: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/services/admin-auth.service", () => ({ adminAuthService: svc }));

import { AdminAcceptInvite } from "./AdminAcceptInvite";

function campo(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function erroHttp(status: number, message?: string) {
  return new AxiosError("erro", "ERR", undefined, null, {
    status,
    data: message ? { message } : {},
  } as never);
}

async function preencher(
  user: ReturnType<typeof userEvent.setup>,
  senha: string,
  confirmacao = senha,
) {
  await user.type(campo("admin-new-password"), senha);
  await user.type(campo("admin-confirm-password"), confirmacao);
  await user.click(screen.getByRole("button", { name: "Criar senha" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(
    {},
    "",
    "/admin/primeiro-acesso#email=bia%40inexci.com&token=tok-1",
  );
});

describe("AdminAcceptInvite", () => {
  it("lê e-mail e token do hash e limpa a URL", async () => {
    render(<AdminAcceptInvite />);
    expect(await screen.findByText("bia@inexci.com")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
  });

  it("mostra os requisitos da senha", async () => {
    const user = userEvent.setup();
    render(<AdminAcceptInvite />);
    await screen.findByText("bia@inexci.com");
    await user.type(campo("admin-new-password"), "abc");
    expect(screen.getByText("Pelo menos 8 caracteres")).toBeInTheDocument();
  });

  it("senha fraca ou diferente não chama a API", async () => {
    const user = userEvent.setup();
    render(<AdminAcceptInvite />);
    await screen.findByText("bia@inexci.com");
    await preencher(user, "Senha123@", "Outra123@");
    expect(svc.acceptInvite).not.toHaveBeenCalled();
  });

  it("aceita o convite e volta ao login com aviso", async () => {
    svc.acceptInvite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdminAcceptInvite />);
    await screen.findByText("bia@inexci.com");

    await preencher(user, "Senha123@");

    expect(svc.acceptInvite).toHaveBeenCalledWith(
      "bia@inexci.com",
      "tok-1",
      "Senha123@",
    );
    expect(replace).toHaveBeenCalledWith("/admin/login?convite=aceito");
  });

  it("convite vencido mostra o aviso para pedir outro", async () => {
    svc.acceptInvite.mockRejectedValue(erroHttp(401));
    const user = userEvent.setup();
    render(<AdminAcceptInvite />);
    await screen.findByText("bia@inexci.com");

    await preencher(user, "Senha123@");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Convite inválido ou expirado/,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("link sem token mostra link inválido", async () => {
    window.history.replaceState({}, "", "/admin/primeiro-acesso");
    render(<AdminAcceptInvite />);
    expect(
      await screen.findByRole("heading", { name: "Link inválido" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ir para o login" }),
    ).toHaveAttribute("href", "/admin/login");
  });
});
