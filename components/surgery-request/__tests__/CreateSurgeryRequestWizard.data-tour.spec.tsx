import { describe, it, expect, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/services/procedure.service", () => ({
  procedureService: {
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  },
}));

vi.mock("@/hooks/useAvailableDoctors", () => {
  const resultado = { data: [], isLoading: false };
  return { useAvailableDoctors: () => resultado };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ can: () => true, permissions: ["solicitacoes"] }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: true }),
}));

const registeredActions = new Map<string, () => void>();
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: (id: string, fn: () => void) => {
    registeredActions.set(id, fn);
  },
}));

import { CreateSurgeryRequestWizard } from "../CreateSurgeryRequestWizard";

describe("CreateSurgeryRequestWizard — âncora do tour", () => {
  it("expõe sc-wizard-novo-cadastro dentro do diálogo em portal", () => {
    renderWithProviders(
      <CreateSurgeryRequestWizard
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    act(() => registeredActions.get("sc-abrir-selecao-procedimento")?.());

    const ancora = document.querySelector(
      '[data-tour="sc-wizard-novo-cadastro"]',
    );
    expect(ancora).not.toBeNull();
    expect(screen.getByRole("dialog")).toContainElement(
      ancora as HTMLElement,
    );
  });
});
