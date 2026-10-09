import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinnerButton } from "@/components/shared/ModalFooter";

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
