import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ColaboradoresLayout from "./layout";
import { Permission } from "@/lib/permissions";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

let authState: {
  loading: boolean;
  permissions: Permission[];
  isAdmin: boolean;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    ...authState,
    can: (p: Permission) => authState.permissions.includes(p),
  }),
}));

function renderizar() {
  return render(
    <ColaboradoresLayout>
      <div>lista de colaboradores</div>
    </ColaboradoresLayout>,
  );
}

describe("ColaboradoresLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      loading: false,
      permissions: [Permission.ADMINISTRACAO],
      isAdmin: false,
    };
  });

  /**
   * Regressão do gate por `role`: o admin delegado tem
   * `role = "collaborator"` + Administração e era expulso da própria tela que
   * a permissão libera. Como a casa dele aponta para `/colaboradores`, os dois
   * redirects se encontravam e a aplicação entrava em loop.
   */
  it("libera o admin delegado (permissão sem role=admin)", () => {
    renderizar();
    expect(screen.getByText("lista de colaboradores")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("libera o dono da conta", () => {
    authState = {
      loading: false,
      permissions: [
        Permission.AGENDA,
        Permission.ATENDIMENTO,
        Permission.SOLICITACOES,
        Permission.ADMINISTRACAO,
      ],
      isAdmin: true,
    };
    renderizar();
    expect(screen.getByText("lista de colaboradores")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("expulsa quem não tem Administração", () => {
    authState = {
      loading: false,
      permissions: [Permission.ATENDIMENTO],
      isAdmin: false,
    };
    renderizar();
    expect(screen.queryByText("lista de colaboradores")).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/atendimento");
  });

  it("manda a recusa para a casa do usuário, não para /dashboard fixo", () => {
    authState = {
      loading: false,
      permissions: [Permission.AGENDA],
      isAdmin: false,
    };
    renderizar();
    // /dashboard exige Solicitações — devolver para lá criaria outro salto.
    expect(replaceMock).toHaveBeenCalledWith("/agenda");
  });

  it("não redireciona enquanto a sessão carrega", () => {
    authState = { loading: true, permissions: [], isAdmin: false };
    renderizar();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText("lista de colaboradores")).not.toBeInTheDocument();
  });
});
