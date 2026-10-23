import { vi } from "vitest";

export class FakeMediaRecorder {
  static instancias: FakeMediaRecorder[] = [];
  static isTypeSupported = (tipo: string) => tipo.startsWith("audio/webm");
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((evento: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    opcoes?: { mimeType?: string },
  ) {
    this.mimeType = opcoes?.mimeType ?? "audio/webm";
    FakeMediaRecorder.instancias.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["audio"], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}

export function instalarMicrofoneFalso(
  getUserMedia: () => Promise<MediaStream> = () =>
    Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream),
) {
  FakeMediaRecorder.instancias = [];
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  });
}

export function removerMicrofoneFalso() {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
}
