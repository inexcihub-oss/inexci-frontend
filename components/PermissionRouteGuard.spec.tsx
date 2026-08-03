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

  /**
   * `/procedimentos` edita `SurgeryRequestTemplate` — o backend exige
   * Solicitações em `GET/POST/PATCH/DELETE /surgery-requests/templates/*`,
   * então a rota não pode ficar de fora de `ROUTE_PERMISSIONS` (senão a tela
   * carrega e só a lista falha com 403).
   */
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

  /**
   * Ponto 2 da Tarefa 17: enquanto o AuthContext ainda resolve o perfil,
   * `permissions` chega vazio por estar em trânsito — não porque o usuário
   * não tem acesso. Sem essa checagem, todo mundo seria chutado para a home
   * no primeiro render, mesmo tendo a permissão da rota.
   */
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
