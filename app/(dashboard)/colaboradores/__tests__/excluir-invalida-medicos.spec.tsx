import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Excluir um colaborador que é profissional de saúde precisa tirá-lo da lista
 * de médicos em cache (`["available-doctors"]`) — senão o wizard de SC e a
 * agenda seguem oferecendo-o por até 5 minutos.
 */

const { getAll, remove } = vi.hoisted(() => ({
  getAll: vi.fn(),
  remove: vi.fn(),
}));

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
  collaboratorService: { getAll, delete: remove, deleteMany: vi.fn() },
}));

import ColaboradoresPage from "../page";

describe("Colaboradores — excluir invalida a lista de médicos", () => {
  it("após excluir, invalida ['available-doctors']", async () => {
    getAll.mockResolvedValue([
      {
        id: "colab-1",
        name: "Dra. Ana Souza",
        email: "ana@clinica.com",
        phone: "21999998888",
        status: "active",
        isDoctor: true,
        doctorProfile: { id: "dp-1", council: "CRM" },
      },
    ]);
    remove.mockResolvedValue(undefined);
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    render(
      <QueryClientProvider client={client}>
        <ColaboradoresPage />
      </QueryClientProvider>,
    );

    const [botaoExcluir] = await screen.findAllByTitle("Excluir colaborador");
    fireEvent.click(botaoExcluir);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("colab-1"));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["available-doctors"],
    });
  });
});
