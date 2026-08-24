import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollaboratorActionsSection } from "../CollaboratorActionsSection";

/**
 * Prova que a ficha do colaborador carrega a âncora `data-tour` que a trilha
 * `administracao` (passo "ciclo") espera encontrar:
 * "colaborador-ciclo-status", e que o toggle fica travado para o colaborador
 * fabricado do tour.
 */

describe("CollaboratorActionsSection — âncora do tour", () => {
  it('expõe data-tour="colaborador-ciclo-status"', () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="col-1"
        currentStatus="active"
      />,
    );

    expect(
      document.querySelector('[data-tour="colaborador-ciclo-status"]'),
    ).not.toBeNull();
  });

  it("trava o toggle de status para o colaborador fabricado do tour", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
