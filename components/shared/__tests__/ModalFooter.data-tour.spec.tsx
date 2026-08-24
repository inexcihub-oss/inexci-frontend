import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinnerButton } from "@/components/shared/ModalFooter";

/**
 * `SpinnerButtonProps` é uma interface fechada de propósito (não faz spread
 * de `ButtonHTMLAttributes`), então `data-tour` só chega ao `<button>`
 * renderizado se for declarado explicitamente. É essa âncora que o tour de
 * onboarding usa em `AppointmentDetailModal` ("Iniciar atendimento") — sem
 * este teste, remover o repasse quebra o tour em silêncio.
 */
describe("SpinnerButton — âncora do tour", () => {
  it("repassa data-tour até o <button> renderizado", () => {
    render(
      <SpinnerButton data-tour="atendimento-iniciar" onClick={vi.fn()}>
        Iniciar atendimento
      </SpinnerButton>,
    );

    const botao = screen.getByRole("button", { name: "Iniciar atendimento" });
    expect(botao).toHaveAttribute("data-tour", "atendimento-iniciar");
  });
});
