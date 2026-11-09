import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "a-1", email: "ana@inexci.com", mfaEnabled: false },
    updateUser: vi.fn(),
  }),
}));

import { AdminMfaRequired } from "./AdminMfaRequired";

describe("AdminMfaRequired", () => {
  it("explica a exigência e traz o fluxo de ativação sem sair do painel", () => {
    renderWithProviders(<AdminMfaRequired />);

    expect(
      screen.getByRole("heading", {
        name: "Ative a verificação em duas etapas",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Ativar verificação em duas etapas",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
