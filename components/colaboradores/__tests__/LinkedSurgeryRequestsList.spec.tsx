import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { getAll: vi.fn() },
}));

import {
  LinkedSurgeryRequestsList,
  linkedProcedureName,
} from "../LinkedSurgeryRequestsList";
import type { SurgeryRequestListItem } from "@/services/surgery-request.service";

const sc = (over: Partial<SurgeryRequestListItem>) =>
  ({
    id: 1,
    status: 5,
    patient: { id: "p", name: "Ana" },
    doctor: { id: "d", name: "Dr. Bruno" },
    procedure: null,
    ...over,
  }) as SurgeryRequestListItem;

describe("linkedProcedureName", () => {
  it("usa o procedimento do catálogo, senão o nome da indicação", () => {
    expect(
      linkedProcedureName(sc({ procedure: { id: "x", name: "Artroscopia" } }), "—"),
    ).toBe("Artroscopia");
    expect(linkedProcedureName(sc({ indicationName: "Joelho D" }), "—")).toBe(
      "Joelho D",
    );
    expect(linkedProcedureName(sc({}), "Procedimento")).toBe("Procedimento");
  });
});

describe("LinkedSurgeryRequestsList", () => {
  const getLines = (s: SurgeryRequestListItem) => ({
    primary: s.patient?.name ?? "",
    secondary: linkedProcedureName(s, "Procedimento"),
  });

  it("lista com status, contagem e navega para a solicitação", () => {
    render(
      <LinkedSurgeryRequestsList
        title="Solicitações recentes"
        loading={false}
        requests={[sc({ id: 42, indicationName: "Quadril" })]}
        emptyMessage="Nada"
        getLines={getLines}
      />,
    );
    expect(screen.getByText("Solicitações recentes")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Agendada")).toHaveClass("bg-teal-50");
    fireEvent.click(screen.getByText("Quadril"));
    expect(push).toHaveBeenCalledWith("/solicitacao/42");
  });

  it("mostra a mensagem de vazio e esconde a contagem durante o carregamento", () => {
    const { rerender } = render(
      <LinkedSurgeryRequestsList
        title="T"
        loading={false}
        requests={[]}
        emptyMessage="Nenhuma solicitação encontrada."
        getLines={getLines}
      />,
    );
    expect(
      screen.getByText("Nenhuma solicitação encontrada."),
    ).toBeInTheDocument();
    rerender(
      <LinkedSurgeryRequestsList
        title="T"
        loading
        requests={[]}
        emptyMessage="Nenhuma solicitação encontrada."
        getLines={getLines}
      />,
    );
    expect(screen.queryByText("0")).toBeNull();
  });
});
