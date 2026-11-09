import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const replace = vi.fn();
let pathname = "/admin/clientes";
let auth: { admin: unknown; loading: boolean };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("@/contexts/AdminAuthContext", () => ({
  AdminAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAdminAuth: () => auth,
}));
vi.mock("@/components/admin/AdminSidebar", () => ({
  default: () => <nav>sidebar do painel</nav>,
}));

import AdminLayout from "./layout";

const admin = {
  id: "a-1",
  name: "Ana",
  email: "ana@inexci.com",
  mfaEnabled: true,
};

function montar() {
  return render(
    <AdminLayout>
      <p>conteúdo do painel</p>
    </AdminLayout>,
  );
}

describe("AdminLayout", () => {
  beforeEach(() => {
    replace.mockClear();
    pathname = "/admin/clientes";
    auth = { admin, loading: false };
    window.history.replaceState({}, "", "/");
  });

  it("sem admin, manda para o login do painel com a rota de volta", () => {
    auth = { admin: null, loading: false };
    window.history.replaceState({}, "", "/admin/clientes?situacao=trial");
    montar();

    expect(replace).toHaveBeenCalledWith(
      "/admin/login?next=%2Fadmin%2Fclientes%3Fsituacao%3Dtrial",
    );
    expect(screen.queryByText("conteúdo do painel")).toBeNull();
    expect(screen.queryByText("sidebar do painel")).toBeNull();
  });

  it("enquanto restaura a sessão não redireciona nem mostra o conteúdo", () => {
    auth = { admin: null, loading: true };
    montar();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("conteúdo do painel")).toBeNull();
  });

  it("com admin mostra sidebar e conteúdo", () => {
    montar();

    expect(screen.getByText("sidebar do painel")).toBeInTheDocument();
    expect(screen.getByText("conteúdo do painel")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(["/admin/login", "/admin/primeiro-acesso"])(
    "%s renderiza só a página, sem sidebar e sem exigir sessão",
    (rota) => {
      pathname = rota;
      auth = { admin: null, loading: false };
      montar();

      expect(screen.getByText("conteúdo do painel")).toBeInTheDocument();
      expect(screen.queryByText("sidebar do painel")).toBeNull();
      expect(replace).not.toHaveBeenCalled();
    },
  );
});
