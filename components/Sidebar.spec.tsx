import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
      screen.queryByText("Solicitações Cirúrgicas"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Colaboradores")).not.toBeInTheDocument();
  });

  it("mostra colaboradores para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    render(<Sidebar />);

    expect(screen.getByText("Colaboradores")).toBeInTheDocument();
  });

  it("esconde o dashboard de quem não tem solicitações", () => {
    authState.permissions = [Permission.ATENDIMENTO];
    render(<Sidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Atendimento")).toBeInTheDocument();
  });

  /** Pacientes e cadastros seguem visíveis para qualquer área de trabalho. */
  it("mantém pacientes visível para quem atende", () => {
    authState.permissions = [Permission.ATENDIMENTO];
    render(<Sidebar />);

    expect(screen.getByText("Pacientes")).toBeInTheDocument();
  });
});

describe("filterMenuItems — grupo some quando fica vazio", () => {
  it("remove o grupo quando todos os filhos exigem permissão negada", () => {
    const items = [
      {
        type: "group" as const,
        iconSrc: "/icons/list.svg",
        label: "Grupo Teste",
        children: [
          {
            type: "item" as const,
            iconSrc: "/icons/x.svg",
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
        iconSrc: "/icons/list.svg",
        label: "Grupo Teste",
        children: [
          {
            type: "item" as const,
            iconSrc: "/icons/x.svg",
            label: "Filho Livre",
            href: "/x",
          },
          {
            type: "item" as const,
            iconSrc: "/icons/y.svg",
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
        iconSrc: "/icons/list.svg",
        label: "Grupo Restrito",
        permission: Permission.ADMINISTRACAO,
        children: [
          {
            type: "item" as const,
            iconSrc: "/icons/x.svg",
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
