import { describe, it, expect, vi } from "vitest";
import {
  render as rtlRender,
  type RenderOptions,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

import ColaboradoresPage from "./page";

function render(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/services/collaborator.service", () => ({
  collaboratorService: {
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

describe("Tela de Colaboradores — âncoras do tour", () => {
  it('expõe data-tour="admin-novo-colaborador" no botão de novo colaborador', async () => {
    render(<ColaboradoresPage />);

    const botao = await screen.findByText("Novo colaborador");
    expect(botao.closest('[data-tour="admin-novo-colaborador"]')).not.toBeNull();
  });
});
