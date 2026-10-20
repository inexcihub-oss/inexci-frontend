import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ColaboradoresLayout from "./layout";
import { Permission } from "@/lib/permissions";

const replaceMock = vi.fn();
let pathname = "/colaboradores";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathname,
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
    pathname = "/colaboradores";
    authState = {
      loading: false,
      permissions: [Permission.ADMINISTRACAO],
      isAdmin: false,
    };
  });

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
    expect(replaceMock).toHaveBeenCalledWith("/agenda");
  });

  it("não redireciona enquanto a sessão carrega", () => {
    authState = { loading: true, permissions: [], isAdmin: false };
    renderizar();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText("lista de colaboradores")).not.toBeInTheDocument();
  });

  it.each([
    "/colaboradores/hospital/h-1",
    "/colaboradores/convenio/c-1",
    "/colaboradores/fornecedor/f-1",
    "/colaboradores/fabricante/m-1",
  ])("libera %s para quem não tem Administração", (rota) => {
    pathname = rota;
    authState = {
      loading: false,
      permissions: [Permission.SOLICITACOES],
      isAdmin: false,
    };
    renderizar();

    expect(screen.getByText("lista de colaboradores")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("expulsa do cadastro transversal quem não tem área nenhuma", () => {
    pathname = "/colaboradores/hospital/h-1";
    authState = { loading: false, permissions: [], isAdmin: false };
    renderizar();

    expect(screen.queryByText("lista de colaboradores")).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/configuracoes");
  });

  it("continua expulsando de /colaboradores/assistente/:id", () => {
    pathname = "/colaboradores/assistente/a-1";
    authState = {
      loading: false,
      permissions: [Permission.SOLICITACOES],
      isAdmin: false,
    };
    renderizar();

    expect(screen.queryByText("lista de colaboradores")).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });
});
