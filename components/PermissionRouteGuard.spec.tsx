import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

const replace = vi.fn();
let pathname = "/agenda";
let authState = {
  permissions: [] as Permission[],
  loading: false as boolean,
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

import { PermissionRouteGuard } from "./PermissionRouteGuard";

describe("PermissionRouteGuard", () => {
  beforeEach(() => {
    replace.mockClear();
    authState = { permissions: [], loading: false };
  });

  it("renderiza a página quando há permissão", () => {
    pathname = "/agenda";
    authState.permissions = [Permission.AGENDA];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redireciona para a home permitida quando falta permissão", () => {
    pathname = "/solicitacoes-cirurgicas";
    authState.permissions = [Permission.AGENDA];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(replace).toHaveBeenCalledWith("/agenda");
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("libera /financeiro/configuracoes para quem tem financeiro", () => {
    pathname = "/financeiro/configuracoes";
    authState.permissions = [Permission.FINANCEIRO];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("tira do financeiro quem não tem a área", () => {
    pathname = "/financeiro";
    authState.permissions = [Permission.ATENDIMENTO, Permission.ADMINISTRACAO];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(replace).toHaveBeenCalledWith("/atendimento");
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("redireciona de /procedimentos quem não tem solicitações", () => {
    pathname = "/procedimentos";
    authState.permissions = [Permission.AGENDA];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(replace).toHaveBeenCalledWith("/agenda");
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("deixa passar /procedimentos para quem tem solicitações", () => {
    pathname = "/procedimentos";
    authState.permissions = [Permission.SOLICITACOES];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("deixa passar rota sem exigência", () => {
    pathname = "/configuracoes";
    authState.permissions = [];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redireciona colaborador sem nenhuma área de um cadastro transversal", () => {
    pathname = "/colaboradores/hospital/h-1";
    authState.permissions = [];

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(replace).toHaveBeenCalledWith("/configuracoes");
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("não redireciona nem esconde/mostra nada enquanto as permissões ainda carregam", () => {
    pathname = "/solicitacoes-cirurgicas";
    authState = { permissions: [], loading: true };

    render(
      <PermissionRouteGuard>
        <p>conteúdo</p>
      </PermissionRouteGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });
});
