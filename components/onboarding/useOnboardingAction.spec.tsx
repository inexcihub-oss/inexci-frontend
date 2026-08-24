import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useOnboardingAction } from "./useOnboardingAction";
import { useOnboarding } from "./OnboardingProvider";

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: vi.fn(),
}));

const useOnboardingMock = vi.mocked(useOnboarding);

describe("useOnboardingAction", () => {
  it("registra a ação no mount e desregistra no unmount", () => {
    const registrarAcao = vi.fn();
    const desregistrarAcao = vi.fn();
    useOnboardingMock.mockReturnValue({
      registrarAcao,
      desregistrarAcao,
    } as unknown as ReturnType<typeof useOnboarding>);

    const fn = vi.fn();
    function Componente() {
      useOnboardingAction("acao-x", fn);
      return null;
    }

    const { unmount } = render(<Componente />);

    expect(registrarAcao).toHaveBeenCalledWith("acao-x", expect.any(Function));
    const registrada = registrarAcao.mock.calls[0][1] as () => void;
    registrada();
    expect(fn).toHaveBeenCalledTimes(1);

    unmount();
    expect(desregistrarAcao).toHaveBeenCalledWith("acao-x");
  });

  it("não reregistra quando só a identidade de `fn` muda, só quando `id` muda", () => {
    const registrarAcao = vi.fn();
    const desregistrarAcao = vi.fn();
    useOnboardingMock.mockReturnValue({
      registrarAcao,
      desregistrarAcao,
    } as unknown as ReturnType<typeof useOnboarding>);

    function Componente({ fn }: { fn: () => void }) {
      useOnboardingAction("acao-estavel", fn);
      return null;
    }

    const { rerender } = render(<Componente fn={() => {}} />);
    expect(registrarAcao).toHaveBeenCalledTimes(1);

    rerender(<Componente fn={() => {}} />);
    expect(registrarAcao).toHaveBeenCalledTimes(1);

    const chamada = vi.fn();
    rerender(<Componente fn={chamada} />);
    const registrada = registrarAcao.mock.calls[0][1] as () => void;
    act(() => registrada());
    expect(chamada).toHaveBeenCalledTimes(1);
  });
});
