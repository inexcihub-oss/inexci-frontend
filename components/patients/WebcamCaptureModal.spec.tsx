import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebcamCaptureModal } from "./WebcamCaptureModal";

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
});
