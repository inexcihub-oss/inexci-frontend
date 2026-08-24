import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingCelebration } from "./OnboardingCelebration";

describe("OnboardingCelebration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra a mensagem de conclusão", () => {
    render(<OnboardingCelebration onDone={vi.fn()} />);

    expect(
      screen.getByText("Você está pronto para começar"),
    ).toBeInTheDocument();
  });

  it("só fecha quando a pessoa confirma", async () => {
    const onDone = vi.fn();
    render(<OnboardingCelebration onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Começar a usar" }),
    );

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("renderiza confetes por padrão", () => {
    const { container } = render(<OnboardingCelebration onDone={vi.fn()} />);

    expect(
      container.querySelectorAll('[data-confetti="true"]').length,
    ).toBeGreaterThan(0);
  });

  /**
   * Mesmo princípio já usado em `useTargetRect.movimentoReduzido()`: quem
   * pede menos movimento não deveria ver confete caindo animado — só a
   * mensagem de conclusão, que não depende de animação nenhuma.
   */
  it("não renderiza confetes quando o usuário pede menos movimento", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const { container } = render(<OnboardingCelebration onDone={vi.fn()} />);

    expect(container.querySelectorAll('[data-confetti="true"]').length).toBe(0);
    expect(
      screen.getByText("Você está pronto para começar"),
    ).toBeInTheDocument();
  });

  it("não fecha apenas por ficar montada", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<OnboardingCelebration onDone={onDone} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});
