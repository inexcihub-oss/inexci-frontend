import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollaboratorActionsSection } from "../CollaboratorActionsSection";
import { collaboratorService } from "@/services/collaborator.service";

vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    toggleStatus: vi.fn(),
    resendInvite: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

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

  it("handleToggleStatus não chama collaboratorService.toggleStatus para o colaborador fabricado, mesmo com o switch nativamente habilitado", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    // O DOM real suprime o evento de clique em elementos `disabled` — para
    // provar que é o HANDLER (não só a UI) que recusa a chamada, removemos o
    // atributo nativo antes de disparar o clique. Sem o guard em
    // `handleToggleStatus`, isso chamaria `toggleStatus` de verdade.
    const switchEl = screen.getByRole("switch") as HTMLButtonElement;
    switchEl.disabled = false;
    fireEvent.click(switchEl);

    expect(collaboratorService.toggleStatus).not.toHaveBeenCalled();
  });

  it("handleResetPassword não chama collaboratorService.resetPassword para o colaborador fabricado, mesmo com o botão nativamente habilitado", () => {
    render(
      <CollaboratorActionsSection
        collaboratorId="tour-demo-colaborador"
        currentStatus="active"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), {
      target: { value: "senha123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repita a nova senha"), {
      target: { value: "senha123" },
    });

    const saveButton = screen.getByRole("button", {
      name: "Salvar nova senha",
    }) as HTMLButtonElement;
    saveButton.disabled = false;
    fireEvent.click(saveButton);

    expect(collaboratorService.resetPassword).not.toHaveBeenCalled();
  });
});
