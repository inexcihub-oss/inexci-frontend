import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { OnboardingProvider, useOnboarding } from "./OnboardingProvider";
import { TourOverlay } from "./TourOverlay";

/**
 * Teste de COMPOSIÇÃO: provider real + overlay real, dentro de StrictMode.
 *
 * Os specs de cada componente mockam o vizinho, então nenhum deles enxerga o
 * defeito que este arquivo existe para pegar: efeito colateral disparado de
 * dentro de um updater de `setState`. O React reexecuta updaters em StrictMode
 * e os executa DURANTE o render — chamar `onClose` (que faz `setActiveTour` no
 * provider) ali produz "Cannot update a component while rendering a different
 * component", que chegou ao usuário em produção sem nenhum teste falhar.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/solicitacoes-cirurgicas",
}));

vi.mock("@/services/onboarding.service", () => ({
  onboardingService: {
    patch: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/onboarding-requirements", () => ({
  fetchRequisitosPendente: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", onboardingState: undefined },
    permissions: [Permission.SOLICITACOES],
    isDoctor: false,
    isAccountOwner: false,
  }),
}));

function AbreTour() {
  const { activeTour, startTour, closeTour } = useOnboarding();
  return (
    <>
      <button data-tour="sc-nova" onClick={() => startTour("solicitacoes")}>
        abrir tour
      </button>
      {activeTour && (
        <TourOverlay trackId={activeTour} onClose={closeTour} />
      )}
    </>
  );
}

describe("composição provider + overlay", () => {
  let erroSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    erroSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    erroSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("percorre o tour até o fim sem setState durante o render", async () => {
    const user = userEvent.setup();

    render(
      <StrictMode>
        <OnboardingProvider>
          <AbreTour />
        </OnboardingProvider>
      </StrictMode>,
    );

    await user.click(screen.getByText("abrir tour"));

    // Avança até o botão final e conclui.
    for (let i = 0; i < 10; i++) {
      const proximo = screen.queryByRole("button", { name: /próximo/i });
      if (!proximo) break;
      await user.click(proximo);
    }
    const concluir = screen.queryByRole("button", { name: /concluir/i });
    if (concluir) await user.click(concluir);

    await act(async () => {});

    const avisos = erroSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => /while rendering a different component/i.test(m));

    expect(avisos).toEqual([]);
  });
});
