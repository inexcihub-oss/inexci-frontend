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
