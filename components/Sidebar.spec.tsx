import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Users } from "lucide-react";
import { Permission } from "@/lib/permissions";

let authState = {
  user: { id: "u-1", name: "Ana", role: "collaborator" },
  permissions: [] as Permission[],
  can: (p: Permission) => authState.permissions.includes(p),
  isAdmin: false,
  isDoctor: false,
  logout: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agenda",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/notifications/NotificationsDropdown", () => ({
  default: () => null,
}));

import Sidebar, { filterMenuItems } from "./Sidebar";

describe("Sidebar — filtro por permissão", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [], isAdmin: false };
  });

  it("mostra só agenda para quem só tem agenda", () => {
    authState.permissions = [Permission.AGENDA];
    render(<Sidebar />);

    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.queryByText("Atendimento")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Solicitações cirúrgicas"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Colaboradores")).not.toBeInTheDocument();
  });

  it("mostra colaboradores para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    render(<Sidebar />);

    expect(screen.getByText("Colaboradores")).toBeInTheDocument();
  });

  it("esconde o dashboard de quem não tem administração, mesmo com solicitações", () => {
    authState.permissions = [Permission.ATENDIMENTO, Permission.SOLICITACOES];
    render(<Sidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Atendimento")).toBeInTheDocument();
  });

  it("mostra o dashboard para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    render(<Sidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("mostra o Financeiro só para quem tem a área", () => {
    authState.permissions = [Permission.FINANCEIRO];
    render(<Sidebar />);
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
  });

  it("esconde o Financeiro de quem não tem a área, mesmo com administração", () => {
    authState.permissions = [Permission.AGENDA, Permission.ADMINISTRACAO];
    render(<Sidebar />);
    expect(screen.queryByText("Financeiro")).not.toBeInTheDocument();
  });

  it("mantém pacientes visível para quem atende", () => {
    authState.permissions = [Permission.ATENDIMENTO];
    render(<Sidebar />);

    expect(screen.getByText("Pacientes")).toBeInTheDocument();
  });

  it("mostra Clínicas só para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    const { unmount } = render(<Sidebar />);
    fireEvent.click(screen.getByText("Cadastros"));
    expect(screen.getByText("Clínicas")).toBeInTheDocument();
    unmount();

    authState.permissions = [Permission.AGENDA];
    render(<Sidebar />);
    fireEvent.click(screen.getByText("Cadastros"));
    expect(screen.queryByText("Clínicas")).not.toBeInTheDocument();
  });
});

describe("filterMenuItems — grupo some quando fica vazio", () => {
  it("remove o grupo quando todos os filhos exigem permissão negada", () => {
    const items = [
      {
        type: "group" as const,
        icon: Users,
        label: "Grupo Teste",
        children: [
          {
            type: "item" as const,
            icon: Users,
            label: "Filho Restrito",
            href: "/x",
            permission: Permission.ADMINISTRACAO,
          },
        ],
      },
    ];

    const result = filterMenuItems(items, () => false);

    expect(result).toHaveLength(0);
  });

  it("mantém o grupo e só o filho liberado quando ao menos um passa", () => {
    const items = [
      {
        type: "group" as const,
        icon: Users,
        label: "Grupo Teste",
        children: [
          {
            type: "item" as const,
            icon: Users,
            label: "Filho Livre",
            href: "/x",
          },
          {
            type: "item" as const,
            icon: Users,
            label: "Filho Restrito",
            href: "/y",
            permission: Permission.ADMINISTRACAO,
          },
        ],
      },
    ];

    const result = filterMenuItems(items, () => false);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "Grupo Teste",
      children: [{ label: "Filho Livre" }],
    });
  });

  it("some com o grupo inteiro se ele mesmo tiver permission negada", () => {
    const items = [
      {
        type: "group" as const,
        icon: Users,
        label: "Grupo Restrito",
        permission: Permission.ADMINISTRACAO,
        children: [
          {
            type: "item" as const,
            icon: Users,
            label: "Filho Livre",
            href: "/x",
          },
        ],
      },
    ];

    const result = filterMenuItems(items, () => false);

    expect(result).toHaveLength(0);
  });
});

describe("Sidebar — blocos do menu", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [], isAdmin: false };
  });

  const bloco = (nome: string) =>
    within(
      screen.getByRole("navigation", { name: "Menu principal" }),
    ).getByRole("group", { name: nome });

  it("trabalho do dia a dia em cima, sem título, e gestão embaixo", () => {
    authState.permissions = [
      Permission.ATENDIMENTO,
      Permission.AGENDA,
      Permission.SOLICITACOES,
      Permission.FINANCEIRO,
      Permission.ADMINISTRACAO,
    ];
    render(<Sidebar />);

    expect(
      within(bloco("Principal"))
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual([
      "Atendimento",
      "Agenda",
      "Pacientes",
      "Solicitações cirúrgicas",
    ]);
    const gestao = bloco("Gestão");
    expect(within(gestao).getByText("Gestão")).toBeInTheDocument();
    expect(
      within(gestao)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Dashboard", "Financeiro", "Colaboradores"]);
  });

  it("Procedimentos fica dentro de Cadastros", () => {
    authState.permissions = [Permission.SOLICITACOES];
    render(<Sidebar />);

    expect(
      within(bloco("Principal")).queryByRole("link", { name: "Procedimentos" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Cadastros/ }));
    expect(
      within(bloco("Gestão")).getByRole("link", { name: "Procedimentos" }),
    ).toBeInTheDocument();
  });

  it("marca o item da rota atual", () => {
    authState.permissions = [Permission.AGENDA];
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
