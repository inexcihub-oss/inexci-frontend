import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Permission } from "@/lib/permissions";
import { ACAO_CADASTROS_ABRIR_MENU_MOBILE } from "@/lib/onboarding/tour-registry";

let authState = {
  permissions: [] as Permission[],
  can: (p: Permission) => authState.permissions.includes(p),
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agenda",
}));

const onboardingActions = new Map<string, () => void>();
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: (id: string, fn: () => void) => {
    onboardingActions.set(id, fn);
  },
}));

import BottomNavBar from "./BottomNavBar";

function openOverflow() {
  fireEvent.click(screen.getByText("Mais"));
}

describe("BottomNavBar — filtro por permissão", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [] };
    onboardingActions.clear();
  });

  it("mostra só agenda e pacientes para quem só tem agenda", () => {
    authState.permissions = [Permission.AGENDA];
    render(<BottomNavBar />);

    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.queryByText("Atendimento")).not.toBeInTheDocument();
    expect(screen.queryByText("Solicitações")).not.toBeInTheDocument();
  });

  it("não mostra Dashboard nem Procedimentos no overflow para quem não tem solicitações", () => {
    authState.permissions = [Permission.ATENDIMENTO];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Procedimentos")).not.toBeInTheDocument();
  });

  it("mostra Dashboard e Procedimentos no overflow para quem tem solicitações", () => {
    authState.permissions = [Permission.SOLICITACOES];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Procedimentos")).toBeInTheDocument();
  });

  it("mostra Colaboradores no overflow para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.getByText("Colaboradores")).toBeInTheDocument();
  });

  it("não mostra Colaboradores no overflow para quem não tem administração", () => {
    authState.permissions = [Permission.AGENDA];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.queryByText("Colaboradores")).not.toBeInTheDocument();
  });

  it("mostra Clínicas no overflow para quem tem administração", () => {
    authState.permissions = [Permission.ADMINISTRACAO];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.getByText("Clínicas")).toBeInTheDocument();
  });

  it("não mostra Clínicas no overflow para quem não tem administração", () => {
    authState.permissions = [Permission.AGENDA];
    render(<BottomNavBar />);
    openOverflow();

    expect(screen.queryByText("Clínicas")).not.toBeInTheDocument();
  });

  it("abre o menu de cadastros quando a trilha pede no mobile", () => {
    render(<BottomNavBar />);

    act(() => onboardingActions.get(ACAO_CADASTROS_ABRIR_MENU_MOBILE)?.());

    expect(screen.getByText("Hospitais")).toBeInTheDocument();
    expect(screen.getByText("Convênios")).toBeInTheDocument();
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
    expect(
      document.querySelector('[data-tour="cadastros-menu-mobile"]'),
    ).not.toBeNull();
  });
});

describe("BottomNavBar — layout se adapta à quantidade de itens", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [] };
  });

  it("agrupa ao centro quando sobram poucos itens (<=3 no total)", () => {
    authState.permissions = [Permission.AGENDA];
    const { container } = render(<BottomNavBar />);

    const bar = container.querySelector("nav > div");
    expect(bar).toHaveClass("justify-center");
    expect(bar).not.toHaveClass("justify-around");
  });

  it("ocupa a barra de ponta a ponta quando há itens suficientes (>3 no total)", () => {
    authState.permissions = [
      Permission.ATENDIMENTO,
      Permission.AGENDA,
      Permission.SOLICITACOES,
      Permission.ADMINISTRACAO,
    ];
    const { container } = render(<BottomNavBar />);

    const bar = container.querySelector("nav > div");
    expect(bar).toHaveClass("justify-around");
    expect(bar).not.toHaveClass("justify-center");
  });
});
