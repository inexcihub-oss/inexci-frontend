import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTargetRect } from "./useTargetRect";

describe("useTargetRect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // jsdom não implementa ResizeObserver.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("encontra um alvo já presente", async () => {
    const alvo = document.createElement("button");
    alvo.setAttribute("data-tour", "sc-nova");
    document.body.appendChild(alvo);

    const { result } = renderHook(() => useTargetRect("sc-nova"));

    await waitFor(() => expect(result.current.estado).toBe("encontrado"));
    expect(result.current.rect).not.toBeNull();
  });

  it("encontra um alvo que aparece depois (navegação)", async () => {
    const { result } = renderHook(() => useTargetRect("sc-nova"));

    expect(result.current.estado).toBe("buscando");

    act(() => {
      const alvo = document.createElement("button");
      alvo.setAttribute("data-tour", "sc-nova");
      document.body.appendChild(alvo);
    });

    await waitFor(() => expect(result.current.estado).toBe("encontrado"));
  });

  /**
   * O caso que sustenta a regra "alvo ausente não trava o tour": lista vazia,
   * viewport mobile, permissão parcial. Sem o timeout, o overlay giraria
   * para sempre sobre uma tela onde o elemento nunca vai existir.
   */
  it("desiste depois do timeout e reporta ausente", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useTargetRect("nao-existe", { timeoutMs: 1000 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.estado).toBe("ausente");
    expect(result.current.rect).toBeNull();
  });

  it("passo sem alvo declarado já nasce ausente, sem esperar", () => {
    const { result } = renderHook(() => useTargetRect(undefined));

    expect(result.current.estado).toBe("ausente");
  });
});
