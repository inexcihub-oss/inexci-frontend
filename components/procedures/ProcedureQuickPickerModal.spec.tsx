import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { procedureFixture } = vi.hoisted(() => ({
  procedureFixture: {
    id: "proc-1",
    name: "Artroscopia de joelho",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
}));

vi.mock("@/services/procedure.service", () => ({
  procedureService: {
    getAll: vi.fn().mockResolvedValue([procedureFixture]),
    delete: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ can: () => true, permissions: ["atendimento"] }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false }),
}));

import { procedureService } from "@/services/procedure.service";
import { ProcedureQuickPickerModal } from "./ProcedureQuickPickerModal";

/**
 * Reaproveita, fora do wizard de criação de SC, a mesma combinação
 * "buscar procedimento na lista + botão Novo que cria um" que o primeiro
 * passo do wizard já usa (`ProcedureSelectionContent` + `CreateProcedureModal`)
 * — sem arrastar paciente/hospital/convênio junto.
 */
describe("ProcedureQuickPickerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (procedureService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      procedureFixture,
    ]);
  });

  function renderModal(onSelect = vi.fn()) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return {
      onSelect,
      ...render(
        <QueryClientProvider client={queryClient}>
          <ProcedureQuickPickerModal
            isOpen
            onClose={vi.fn()}
            onSelect={onSelect}
          />
        </QueryClientProvider>,
      ),
    };
  }

  it("lista os procedimentos do catálogo e seleciona um existente", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderModal();

    const item = await screen.findByText("Artroscopia de joelho");
    await user.click(item);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "proc-1", name: "Artroscopia de joelho" }),
    );
  });

  it("usa o bottom-sheet padrão do design system, com offset da navbar inferior no mobile", async () => {
    renderModal();

    const dialog = await screen.findByRole("dialog", { name: "Procedimento" });
    // `.mobile-sheet-offset` é o que evita o modal ficar escondido atrás da
    // BottomNavBar (fixed, z-[70]) no mobile — ver app/globals.css.
    expect(dialog).toHaveClass("mobile-sheet-offset");
  });

  it("cria um procedimento novo (nome digitado) e o seleciona", async () => {
    (procedureService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "proc-novo",
      name: "Colecistectomia",
    });
    const user = userEvent.setup();
    const { onSelect } = renderModal();

    await screen.findByText("Artroscopia de joelho");
    await user.click(screen.getByRole("button", { name: "Novo" }));

    await user.type(
      screen.getByPlaceholderText("Ex. Artroscopia de Joelho"),
      "Colecistectomia",
    );
    await user.click(
      screen.getByRole("button", { name: /adicionar procedimento/i }),
    );

    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "proc-novo", name: "Colecistectomia" }),
      ),
    );
  });
});
