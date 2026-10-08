import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MENSAGEM_PRAZO_CAMERA,
  PRAZO_CAMERA_MS,
  WebcamCaptureModal,
} from "./WebcamCaptureModal";

const stop = vi.fn();
const getUserMedia = vi.fn();

function cameraFalsa() {
  return { getTracks: () => [{ stop }] } as unknown as MediaStream;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  getUserMedia.mockResolvedValue(cameraFalsa());
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 1200 });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    cb(new Blob(["jpeg"], { type: "image/jpeg" }));
  });
  URL.createObjectURL = vi.fn(() => "blob:previa");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => vi.restoreAllMocks());

describe("WebcamCaptureModal", () => {
  it("pede a câmera frontal sem áudio e libera o botão de capturar", async () => {
    render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Tirar foto" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled(),
    );
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: "user" }) }),
    );
  });

  it("captura (até 1280 px), permite tirar outra e usa a foto como JPEG, desligando a câmera", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    render(<WebcamCaptureModal onClose={vi.fn()} onCapture={onCapture} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: /Capturar/ }));
    expect(screen.getByAltText("Foto capturada")).toHaveAttribute("src", "blob:previa");
    const canvas = vi.mocked(HTMLCanvasElement.prototype.toBlob).mock.contexts[0] as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([1280, 960]);

    await user.click(screen.getByRole("button", { name: /Tirar outra/ }));
    expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Capturar/ }));

    await user.click(screen.getByRole("button", { name: "Usar esta foto" }));
    expect(onCapture).toHaveBeenCalledTimes(1);
    const foto = onCapture.mock.calls[0][0] as File;
    expect(foto.type).toBe("image/jpeg");
    expect(foto.name).toMatch(/\.jpg$/);
    expect(stop).toHaveBeenCalled();
  });

  it("permissão negada explica como liberar e permite tentar de novo", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    const user = userEvent.setup();
    render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/acesso à câmera foi bloqueado/);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled());
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("sem câmera no dispositivo avisa", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotFoundError" }));
    render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Nenhuma câmera foi encontrada");
  });

  it("navegador sem suporte manda enviar um arquivo", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Envie uma foto do dispositivo/);
  });

  it("fechar (X ou Esc) desliga a câmera", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(<WebcamCaptureModal onClose={onClose} onCapture={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Fechar câmera" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it("o Esc da câmera não chega às outras camadas abertas", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const outraCamada = vi.fn();
    document.addEventListener("keydown", outraCamada);
    try {
      render(<WebcamCaptureModal onClose={onClose} onCapture={vi.fn()} />);
      await waitFor(() => expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled());

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(outraCamada).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", outraCamada);
    }
  });

  it("câmera que só abre depois do fechamento é desligada na hora", async () => {
    let entregar: (s: MediaStream) => void = () => undefined;
    getUserMedia.mockReturnValueOnce(
      new Promise<MediaStream>((resolve) => {
        entregar = resolve;
      }),
    );
    const { unmount } = render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);

    unmount();
    expect(stop).not.toHaveBeenCalled();
    entregar(cameraFalsa());

    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it("em StrictMode (monta, desmonta, monta) nenhum stream fica ligado", async () => {
    const stops = [vi.fn(), vi.fn()];
    const entregas: Array<(s: MediaStream) => void> = [];
    getUserMedia.mockImplementation(
      () =>
        new Promise<MediaStream>((resolve) => {
          entregas.push(resolve);
        }),
    );
    const { unmount } = render(
      <StrictMode>
        <WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />
      </StrictMode>,
    );
    await waitFor(() => expect(entregas).toHaveLength(2));

    // O pedido do primeiro efeito (já desmontado) resolve depois do segundo.
    entregas[1]({ getTracks: () => [{ stop: stops[1] }] } as unknown as MediaStream);
    await waitFor(() => expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled());
    entregas[0]({ getTracks: () => [{ stop: stops[0] }] } as unknown as MediaStream);
    await waitFor(() => expect(stops[0]).toHaveBeenCalled());
    expect(stops[1]).not.toHaveBeenCalled();

    unmount();
    expect(stops[1]).toHaveBeenCalled();
  });

  describe("prazo para abrir a câmera", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("permissão sem resposta: após o prazo explica e oferece tentar de novo", async () => {
      let entregarTarde: (s: MediaStream) => void = () => undefined;
      getUserMedia.mockReturnValueOnce(
        new Promise<MediaStream>((resolve) => {
          entregarTarde = resolve;
        }),
      );
      render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);
      expect(screen.getByText(/Abrindo a câmera/)).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(PRAZO_CAMERA_MS - 1);
      });
      expect(screen.queryByRole("alert")).toBeNull();
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_PRAZO_CAMERA);
      expect(screen.queryByText(/Abrindo a câmera/)).toBeNull();

      // O navegador entrega a câmera depois do prazo: o stream é parado na
      // hora (sem prévia, a luz da webcam não pode ficar acesa).
      await act(async () => {
        entregarTarde(cameraFalsa());
      });
      expect(stop).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_PRAZO_CAMERA);

      // Tentar de novo faz um pedido novo, que agora abre.
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
      });
      expect(getUserMedia).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled();
    });

    it("câmera que abre dentro do prazo não é interrompida depois", async () => {
      render(<WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByRole("button", { name: /Capturar/ })).toBeEnabled();

      await act(async () => {
        vi.advanceTimersByTime(PRAZO_CAMERA_MS * 2);
      });
      expect(screen.queryByRole("alert")).toBeNull();
      expect(stop).not.toHaveBeenCalled();
    });

    it("fechar antes do prazo cancela o aviso", async () => {
      getUserMedia.mockReturnValueOnce(new Promise<MediaStream>(() => undefined));
      const { unmount } = render(
        <WebcamCaptureModal onClose={vi.fn()} onCapture={vi.fn()} />,
      );
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
