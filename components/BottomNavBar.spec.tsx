import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

let authState = {
  permissions: [] as Permission[],
  can: (p: Permission) => authState.permissions.includes(p),
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agenda",
}));

import BottomNavBar from "./BottomNavBar";

/** Abre o sheet de overflow clicando no botão "Mais". */
function openOverflow() {
  fireEvent.click(screen.getByText("Mais"));
}

describe("BottomNavBar — filtro por permissão", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [] };
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
    // Procedimentos edita `SurgeryRequestTemplate` — exige Solicitações
    // (correção da classificação anterior, que tratava o item como
    // transversal a toda a conta).
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
});

describe("BottomNavBar — layout se adapta à quantidade de itens", () => {
  beforeEach(() => {
    authState = { ...authState, permissions: [] };
  });

  it("agrupa ao centro quando sobram poucos itens (<=3 no total)", () => {
    authState.permissions = [Permission.AGENDA];
    const { container } = render(<BottomNavBar />);

    // Agenda + Pacientes + "Mais" = 3 itens no total: layout compacto.
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

    // Atendimento + Agenda + Solicitações + Pacientes + "Mais" = 5 itens: sem limite por item.
    const bar = container.querySelector("nav > div");
    expect(bar).toHaveClass("justify-around");
    expect(bar).not.toHaveClass("justify-center");
  });
});
