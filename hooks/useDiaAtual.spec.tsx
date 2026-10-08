import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { diaParaData, useDiaAtual } from "./useDiaAtual";

describe("useDiaAtual", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("vira o dia sozinho à meia-noite", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 0));
    const { result } = renderHook(() => useDiaAtual());
    expect(result.current).toBe("2026-10-07");

    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(result.current).toBe("2026-10-08");
  });

  it("confere o dia ao voltar o foco para a janela", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0));
    const { result } = renderHook(() => useDiaAtual());
    expect(result.current).toBe("2026-10-07");

    // Computador suspenso: o relógio pulou sem o timer disparar.
    vi.setSystemTime(new Date(2026, 9, 8, 8, 0, 0));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe("2026-10-08");
  });

  it("diaParaData devolve a meia-noite local do dia", () => {
    expect(diaParaData("2026-10-08").getTime()).toBe(
      new Date(2026, 9, 8).getTime(),
    );
  });
});
