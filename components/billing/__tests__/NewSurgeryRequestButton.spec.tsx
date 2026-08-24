import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewSurgeryRequestButton } from "../NewSurgeryRequestButton";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    canCreateSurgeryRequest: true,
    blockReason: null,
    blockReasonCode: null,
  }),
}));

/**
 * `NewSurgeryRequestButton` espalha `...buttonProps` no `Button` de UI, que
 * por sua vez espalha `...props` no `<button>` nativo. É essa cadeia que
 * carrega `data-tour="sc-nova"` (a âncora do tour de onboarding) até o DOM —
 * se algum elo passar a filtrar props não reconhecidas, o tour perde o alvo
 * em silêncio.
 */
describe("NewSurgeryRequestButton — âncora do tour", () => {
  it("repassa data-tour até o <button> renderizado", () => {
    render(
      <NewSurgeryRequestButton data-tour="sc-nova" onClick={vi.fn()}>
        Nova solicitação
      </NewSurgeryRequestButton>,
    );

    const botao = screen.getByRole("button", { name: "Nova solicitação" });
    expect(botao).toHaveAttribute("data-tour", "sc-nova");
  });
});
