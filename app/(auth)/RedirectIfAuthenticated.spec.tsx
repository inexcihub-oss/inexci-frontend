import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RedirectIfAuthenticated } from "./RedirectIfAuthenticated";

let pathname = "/login";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

let authState: { isAuthenticated: boolean; loading: boolean } = {
  isAuthenticated: false,
  loading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

// Navegação dura é feita via window.location.replace — espionada aqui.
const locationReplaceMock = vi.fn();
const originalLocation = window.location;

describe("RedirectIfAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    pathname = "/login";
    authState = { isAuthenticated: false, loading: false };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, replace: locationReplaceMock },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renderiza o conteúdo público quando não há sessão", () => {
    render(
      <RedirectIfAuthenticated>
        <div>formulário de login</div>
      </RedirectIfAuthenticated>,
    );
    expect(screen.getByText("formulário de login")).toBeInTheDocument();
    expect(locationReplaceMock).not.toHaveBeenCalled();
  });

  it("redireciona usuário autenticado para a área logada (navegação dura)", () => {
    authState = { isAuthenticated: true, loading: false };
    render(
      <RedirectIfAuthenticated>
        <div>formulário de login</div>
      </RedirectIfAuthenticated>,
    );
    expect(locationReplaceMock).toHaveBeenCalledWith("/solicitacoes-cirurgicas");
    // Não renderiza o formulário enquanto redireciona (evita flash).
    expect(screen.queryByText("formulário de login")).not.toBeInTheDocument();
  });

  it("não redireciona enquanto a sessão ainda está carregando", () => {
    authState = { isAuthenticated: false, loading: true };
    render(
      <RedirectIfAuthenticated>
        <div>conteúdo</div>
      </RedirectIfAuthenticated>,
    );
    expect(locationReplaceMock).not.toHaveBeenCalled();
  });

  it("mostra o formulário imediatamente quando carregando sem indício de sessão", () => {
    authState = { isAuthenticated: false, loading: true };
    render(
      <RedirectIfAuthenticated>
        <div>formulário de login</div>
      </RedirectIfAuthenticated>,
    );
    expect(screen.getByText("formulário de login")).toBeInTheDocument();
  });

  it("segura o formulário enquanto resolve a sessão se há indício de login (evita flash)", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "user-1", email: "a@b.com" }),
    );
    authState = { isAuthenticated: false, loading: true };
    render(
      <RedirectIfAuthenticated>
        <div>formulário de login</div>
      </RedirectIfAuthenticated>,
    );
    expect(screen.queryByText("formulário de login")).not.toBeInTheDocument();
  });

  it("não expulsa usuário autenticado da confirmação de e-mail (rota isenta)", () => {
    pathname = "/confirmar-email";
    authState = { isAuthenticated: true, loading: false };
    render(
      <RedirectIfAuthenticated>
        <div>confirmação por token</div>
      </RedirectIfAuthenticated>,
    );
    expect(locationReplaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("confirmação por token")).toBeInTheDocument();
  });

  it("redireciona usuário autenticado para fora do /primeiro-acesso", () => {
    pathname = "/primeiro-acesso";
    authState = { isAuthenticated: true, loading: false };
    render(
      <RedirectIfAuthenticated>
        <div>criar sua senha</div>
      </RedirectIfAuthenticated>,
    );
    expect(locationReplaceMock).toHaveBeenCalledWith("/solicitacoes-cirurgicas");
    expect(screen.queryByText("criar sua senha")).not.toBeInTheDocument();
  });

  it("redireciona usuário autenticado para fora do /forgot-password", () => {
    pathname = "/forgot-password";
    authState = { isAuthenticated: true, loading: false };
    render(
      <RedirectIfAuthenticated>
        <div>recuperar senha</div>
      </RedirectIfAuthenticated>,
    );
    expect(locationReplaceMock).toHaveBeenCalledWith("/solicitacoes-cirurgicas");
    expect(screen.queryByText("recuperar senha")).not.toBeInTheDocument();
  });
});
