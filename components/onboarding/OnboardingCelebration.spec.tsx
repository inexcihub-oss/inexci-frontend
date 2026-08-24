import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OnboardingCelebration } from "./OnboardingCelebration";

describe("OnboardingCelebration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra a mensagem de conclusão", () => {
    render(<OnboardingCelebration onDone={vi.fn()} />);

    expect(
      screen.getByText("Tudo pronto! Você já pode usar a plataforma."),
    ).toBeInTheDocument();
  });

  it("chama onDone sozinha depois de alguns segundos, sem exigir clique", () => {
    const onDone = vi.fn();
    render(<OnboardingCelebration onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("renderiza confetes por padrão", () => {
    const { container } = render(<OnboardingCelebration onDone={vi.fn()} />);

    expect(
      container.querySelectorAll('[aria-hidden="true"]').length,
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

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(0);
    expect(
      screen.getByText("Tudo pronto! Você já pode usar a plataforma."),
    ).toBeInTheDocument();
  });

  it("limpa o timer ao desmontar antes do fim", () => {
    const onDone = vi.fn();
    const { unmount } = render(<OnboardingCelebration onDone={onDone} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});
