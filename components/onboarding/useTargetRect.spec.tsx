import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTargetRect } from "./useTargetRect";

describe("useTargetRect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
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

  it("acompanha o alvo em scroll de container interno (fase de captura)", async () => {
    const container = document.createElement("div");
    const alvo = document.createElement("button");
    alvo.setAttribute("data-tour", "sc-nova");
    container.appendChild(alvo);
    document.body.appendChild(container);

    let topo = 10;
    alvo.getBoundingClientRect = () =>
      ({
        top: topo,
        left: 0,
        width: 10,
        height: 10,
        bottom: topo + 10,
        right: 10,
      }) as DOMRect;

    const { result } = renderHook(() => useTargetRect("sc-nova"));
    await waitFor(() => expect(result.current.estado).toBe("encontrado"));
    expect(result.current.rect?.top).toBe(10);

    topo = 90;
    await act(async () => {
      container.dispatchEvent(new Event("scroll"));
    });

    await waitFor(() => expect(result.current.rect?.top).toBe(90));
  });

  it("remede repetidamente por um tempo após achar o alvo, sem depender de scroll/resize/ResizeObserver", async () => {
    const alvo = document.createElement("div");
    alvo.setAttribute("data-tour", "alvo-anim");
    let topo = 10;
    alvo.getBoundingClientRect = () =>
      ({
        top: topo,
        left: 0,
        width: 10,
        height: 10,
        bottom: topo + 10,
        right: 10,
      }) as DOMRect;
    document.body.appendChild(alvo);

    const { result } = renderHook(() => useTargetRect("alvo-anim"));
    await waitFor(() => expect(result.current.estado).toBe("encontrado"));
    expect(result.current.rect?.top).toBe(10);

    topo = 40;

    await waitFor(() => expect(result.current.rect?.top).toBe(40));
  });

  it("acha o alvo que só entra no DOM depois, dentro do timeout longo", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useTargetRect("alvo-tardio", { timeoutMs: 20000 }),
    );
    expect(result.current.estado).toBe("buscando");

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.estado).toBe("buscando");

    const alvo = document.createElement("div");
    alvo.setAttribute("data-tour", "alvo-tardio");
    document.body.appendChild(alvo);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.estado).toBe("encontrado");
  });

  it("volta a procurar quando o alvo destacado sai do DOM", async () => {
    vi.useFakeTimers();
    const alvo = document.createElement("div");
    alvo.setAttribute("data-tour", "some-depois");
    document.body.appendChild(alvo);

    const { result } = renderHook(() =>
      useTargetRect("some-depois", { timeoutMs: 20000 }),
    );
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.estado).toBe("encontrado");

    alvo.remove();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.estado).toBe("buscando");
  });

  it("limpa observer e listeners ao desmontar", async () => {
    const alvo = document.createElement("button");
    alvo.setAttribute("data-tour", "sc-nova");
    document.body.appendChild(alvo);

    const desconectar = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect = desconectar;
      },
    );
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result, unmount } = renderHook(() => useTargetRect("sc-nova"));
    await waitFor(() => expect(result.current.estado).toBe("encontrado"));

    unmount();

    expect(desconectar).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true,
    );
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("volta a desistir (estado ausente) se o alvo some de novo e não reaparece dentro do timeout", async () => {
    vi.useFakeTimers();
    const alvo = document.createElement("div");
    alvo.setAttribute("data-tour", "some-e-nao-volta");
    document.body.appendChild(alvo);

    const { result } = renderHook(() =>
      useTargetRect("some-e-nao-volta", { timeoutMs: 1000 }),
    );
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.estado).toBe("encontrado");

    alvo.remove();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.estado).toBe("buscando");

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.estado).toBe("ausente");
  });

  it("não anima o scroll quando o usuário pede menos movimento", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const alvo = document.createElement("div");
    alvo.setAttribute("data-tour", "alvo");
    const scrollIntoView = vi.fn();
    alvo.scrollIntoView = scrollIntoView;
    document.body.appendChild(alvo);

    renderHook(() => useTargetRect("alvo"));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "auto",
    });
  });
});
