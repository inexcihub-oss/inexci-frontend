import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  listTeam: vi.fn(),
  createTeamMember: vi.fn(),
  revokeTeamMember: vi.fn(),
  resetTeamMemberAccess: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));
vi.mock("@/contexts/AdminAuthContext", () => ({
  useAdminAuth: () => ({ admin: { id: "me" } }),
}));

import { AdminTeamList } from "./AdminTeamList";

function mockMobile() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

function clearMobile() {
  delete (window as { matchMedia?: unknown }).matchMedia;
}

const base = {
  active: true,
  lastSeenAt: null,
  createdBy: "Ana",
  createdById: "x",
  createdAt: "2026-10-01T10:00:00Z",
};
const team = [
  {
    ...base,
    id: "me",
    name: "Eu Mesmo",
    email: "eu@i.com",
    status: "active",
    mfaEnabled: true,
  },
  {
    ...base,
    id: "u2",
    name: "Beto",
    email: "beto@i.com",
    status: "active",
    mfaEnabled: false,
  },
  {
    ...base,
    id: "u3",
    name: "Carla",
    email: "carla@i.com",
    status: "pending",
    mfaEnabled: false,
    active: false,
  },
  {
    ...base,
    id: "u4",
    name: "Davi",
    email: "davi@i.com",
    status: "inactive",
    mfaEnabled: true,
    active: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  svc.listTeam.mockResolvedValue(team);
  svc.createTeamMember.mockResolvedValue({ id: "n", auditId: "a" });
  svc.revokeTeamMember.mockResolvedValue({ id: "u2", auditId: "a" });
  svc.resetTeamMemberAccess.mockResolvedValue({ id: "u2", auditId: "a" });
});

describe("AdminTeamList", () => {
  it("lista com selos e oculta a revogação na própria linha e nas revogadas", async () => {
    renderWithProviders(<AdminTeamList />);
    expect(await screen.findByText("Beto")).toBeInTheDocument();
    expect(screen.getByText("MFA ativo")).toBeInTheDocument();
    expect(screen.getByText("MFA pendente")).toBeInTheDocument();
    expect(screen.getByText("Convite pendente")).toBeInTheDocument();
    expect(screen.getByText("Revogado")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    const eu = rows.find((r) => within(r).queryByText("Eu Mesmo"))!;
    expect(
      within(eu).queryByRole("button", { name: "Revogar acesso" }),
    ).toBeNull();
    expect(
      within(eu).queryByRole("button", { name: "Redefinir acesso" }),
    ).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Revogar acesso" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Redefinir acesso" }),
    ).toHaveLength(2);
  });

  it("cria administrador e mostra erro do servidor no modal", async () => {
    svc.createTeamMember.mockRejectedValueOnce(
      new AxiosError("x", "E", undefined, undefined, {
        status: 409,
        data: { message: "E-mail já cadastrado" },
      } as never),
    );
    renderWithProviders(<AdminTeamList />);
    await screen.findByText("Beto");
    fireEvent.click(screen.getByRole("button", { name: /Novo administrador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();
    expect(svc.createTeamMember).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Nova Pessoa" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: " Nova@I.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail já cadastrado",
    );
    expect(svc.createTeamMember).toHaveBeenCalledWith({
      name: "Nova Pessoa",
      email: "nova@i.com",
    });
    svc.listTeam.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    await waitFor(() => expect(svc.listTeam).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByLabelText("Nome")).toBeNull());
  });

  it("revoga exigindo motivo e mostra o aviso", async () => {
    renderWithProviders(<AdminTeamList />);
    await screen.findByText("Beto");
    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByText("Beto"))!;
    fireEvent.click(
      within(row).getByRole("button", { name: "Revogar acesso" }),
    );
    expect(
      screen.getByText(
        "A pessoa perde o acesso ao painel na hora e as sessões abertas são encerradas.",
      ),
    ).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Revogar acesso" }),
    );
    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(svc.revokeTeamMember).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Saiu da empresa" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Revogar acesso" }),
    );
    await waitFor(() =>
      expect(svc.revokeTeamMember).toHaveBeenCalledWith("u2", {
        reason: "Saiu da empresa",
      }),
    );
  });

  it("redefine o acesso exigindo motivo", async () => {
    renderWithProviders(<AdminTeamList />);
    await screen.findByText("Beto");
    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByText("Beto"))!;
    fireEvent.click(
      within(row).getByRole("button", { name: "Redefinir acesso" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("beto@i.com")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/senha e a verificação em duas etapas/),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Redefinir acesso" }),
    );
    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(svc.resetTeamMemberAccess).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Perdeu o celular" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Redefinir acesso" }),
    );
    await waitFor(() =>
      expect(svc.resetTeamMemberAccess).toHaveBeenCalledWith("u2", {
        reason: "Perdeu o celular",
      }),
    );
    expect(
      await screen.findByText(
        "Acesso redefinido. Um novo convite foi enviado.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("mostra o erro do servidor ao redefinir", async () => {
    svc.resetTeamMemberAccess.mockRejectedValueOnce(
      new AxiosError("x", "E", undefined, undefined, {
        status: 400,
        data: { message: "Não é possível redefinir o próprio acesso" },
      } as never),
    );
    renderWithProviders(<AdminTeamList />);
    await screen.findByText("Beto");
    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByText("Beto"))!;
    fireEvent.click(
      within(row).getByRole("button", { name: "Redefinir acesso" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Perdeu o celular" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Redefinir acesso" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não é possível redefinir o próprio acesso",
    );
  });

  it("no celular vira cards com situação, dados e ações, sem tabela", async () => {
    mockMobile();
    try {
      renderWithProviders(<AdminTeamList />);
      const beto = (await screen.findByText("Beto")).closest("li")!;
      expect(screen.queryByRole("table")).toBeNull();
      expect(beto).toHaveTextContent("beto@i.com");
      expect(beto).toHaveTextContent("MFA pendente");
      expect(beto).toHaveTextContent("Criado por");
      expect(
        within(beto).getByRole("button", { name: "Revogar acesso" }),
      ).toBeInTheDocument();
      const eu = screen.getByText("Eu Mesmo").closest("li")!;
      expect(
        within(eu).queryByRole("button", { name: "Revogar acesso" }),
      ).toBeNull();
    } finally {
      clearMobile();
    }
  });
});
