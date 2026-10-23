import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import {
  FakeMediaRecorder,
  instalarMicrofoneFalso,
  removerMicrofoneFalso,
} from "@/test-utils/fake-media-recorder";
import { DITADO_MAX_SEGUNDOS, ditadoSuportado, useDitado } from "./useDitado";

describe("useDitado", () => {
  beforeEach(() => instalarMicrofoneFalso());
  afterEach(() => {
    vi.useRealTimers();
    removerMicrofoneFalso();
  });

  it("grava, para e entrega o texto transcrito", async () => {
    const transcrever = vi.fn().mockResolvedValue("  Dor no joelho.  ");
    const aoTranscrever = vi.fn();
    const { result } = renderHook(() => useDitado(transcrever, aoTranscrever));

    await act(() => result.current.iniciar());
    expect(result.current.estado).toBe("gravando");
    expect(FakeMediaRecorder.instancias[0].mimeType).toBe(
      "audio/webm;codecs=opus",
    );

    act(() => result.current.parar());

    await waitFor(() => expect(result.current.estado).toBe("parado"));
    expect(transcrever).toHaveBeenCalledWith(expect.any(Blob));
    expect(aoTranscrever).toHaveBeenCalledWith("Dor no joelho.");
  });

  it("cancelar descarta o áudio sem transcrever", async () => {
    const transcrever = vi.fn();
    const { result } = renderHook(() => useDitado(transcrever, vi.fn()));

    await act(() => result.current.iniciar());
    act(() => result.current.cancelar());

    expect(result.current.estado).toBe("parado");
    expect(transcrever).not.toHaveBeenCalled();
  });

  it("clique repetido enquanto o navegador pede permissão abre um só gravador", async () => {
    let liberar: (stream: MediaStream) => void = () => undefined;
    const parada = vi.fn();
    instalarMicrofoneFalso(
      () =>
        new Promise<MediaStream>((resolve) => {
          liberar = resolve;
        }),
    );
    const { result } = renderHook(() => useDitado(vi.fn(), vi.fn()));

    let primeiro: Promise<void> = Promise.resolve();
    let segundo: Promise<void> = Promise.resolve();
    act(() => {
      primeiro = result.current.iniciar();
      segundo = result.current.iniciar();
    });
    await act(async () => {
      liberar({
        getTracks: () => [{ stop: parada }],
      } as unknown as MediaStream);
      await Promise.all([primeiro, segundo]);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(FakeMediaRecorder.instancias).toHaveLength(1);
    expect(result.current.estado).toBe("gravando");
  });

  it("desmontar antes da permissão não deixa o microfone ligado", async () => {
    let liberar: (stream: MediaStream) => void = () => undefined;
    const parada = vi.fn();
    instalarMicrofoneFalso(
      () =>
        new Promise<MediaStream>((resolve) => {
          liberar = resolve;
        }),
    );
    const { result, unmount } = renderHook(() =>
      useDitado(vi.fn(), vi.fn()),
    );

    let pedido: Promise<void> = Promise.resolve();
    act(() => {
      pedido = result.current.iniciar();
    });
    unmount();
    await act(async () => {
      liberar({
        getTracks: () => [{ stop: parada }],
      } as unknown as MediaStream);
      await pedido;
    });

    expect(FakeMediaRecorder.instancias).toHaveLength(0);
    expect(parada).toHaveBeenCalled();
  });

  it("explica quando o navegador bloqueia o microfone", async () => {
    instalarMicrofoneFalso(() =>
      Promise.reject(new DOMException("negado", "NotAllowedError")),
    );
    const { result } = renderHook(() => useDitado(vi.fn(), vi.fn()));

    await act(() => result.current.iniciar());

    expect(result.current.estado).toBe("parado");
    expect(result.current.erro).toBe(
      "Permita o uso do microfone no navegador para ditar.",
    );
  });

  it("mostra a mensagem da API quando a transcrição falha", async () => {
    const transcrever = vi.fn().mockRejectedValue(
      new AxiosError("x", "ERR", undefined, undefined, {
        status: 403,
        data: { message: "Esta função usa inteligência artificial." },
      } as AxiosResponse),
    );
    const aoTranscrever = vi.fn();
    const { result } = renderHook(() => useDitado(transcrever, aoTranscrever));

    await act(() => result.current.iniciar());
    act(() => result.current.parar());

    await waitFor(() =>
      expect(result.current.erro).toBe(
        "Esta função usa inteligência artificial.",
      ),
    );
    expect(aoTranscrever).not.toHaveBeenCalled();
  });

  it("para sozinho no tempo máximo", async () => {
    vi.useFakeTimers();
    const transcrever = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(() => useDitado(transcrever, vi.fn()));

    await act(() => result.current.iniciar());
    await act(async () => {
      vi.advanceTimersByTime(DITADO_MAX_SEGUNDOS * 1000);
    });

    expect(FakeMediaRecorder.instancias[0].state).toBe("inactive");
    expect(transcrever).toHaveBeenCalled();
  });

  it("detecta navegador sem suporte", () => {
    removerMicrofoneFalso();
    expect(ditadoSuportado()).toBe(false);
  });
});
