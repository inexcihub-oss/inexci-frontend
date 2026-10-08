import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PATIENT_PHOTO_MAX_BYTES,
  desenharReduzido,
  prepararFotoPaciente,
} from "./foto-paciente";

const arquivo = (nome: string, tipo: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], nome, { type: tipo });

/** Navegador com decode e canvas falsos; `jpegBytes` é o tamanho do JPEG gerado. */
function navegadorFalso(jpegBytes: number) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 6000, height: 2000, close }),
  );
  const ctx = { drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: "" };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as never,
  );
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((cb: BlobCallback) =>
      cb(new Blob([new Uint8Array(jpegBytes)], { type: "image/jpeg" })),
    );
  return { ctx, toBlob, close };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("prepararFotoPaciente", () => {
  it("tipo fora de JPG/PNG/WEBP é recusado sem tentar reduzir", async () => {
    const { toBlob } = navegadorFalso(10);
    const r = await prepararFotoPaciente(arquivo("a.gif", "image/gif"));
    expect(r.erro).toMatch(/JPG, PNG ou WEBP/);
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("até 2 MB passa como está", async () => {
    const original = arquivo("a.png", "image/png", PATIENT_PHOTO_MAX_BYTES);
    await expect(prepararFotoPaciente(original)).resolves.toEqual({
      foto: original,
    });
  });

  it("acima de 2 MB: reduz para maior lado 1280 px, JPEG com fundo branco", async () => {
    const { ctx, toBlob, close } = navegadorFalso(200 * 1024);

    const r = await prepararFotoPaciente(
      arquivo("ana.png", "image/png", 5 * 1024 * 1024),
    );

    expect(r.foto?.type).toBe("image/jpeg");
    expect(r.foto?.name).toBe("ana.jpg");
    const canvas = toBlob.mock.contexts[0] as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([1280, 427]);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("mesmo reduzida acima de 2 MB: recusa", async () => {
    navegadorFalso(PATIENT_PHOTO_MAX_BYTES + 1);
    const r = await prepararFotoPaciente(
      arquivo("ana.png", "image/png", 5 * 1024 * 1024),
    );
    expect(r.erro).toMatch(/2 MB/);
  });

  it("navegador não decodifica: recusa como antes", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode")),
    );
    const r = await prepararFotoPaciente(
      arquivo("ana.png", "image/png", 5 * 1024 * 1024),
    );
    expect(r.erro).toMatch(/2 MB/);
  });
});

describe("desenharReduzido", () => {
  it("não amplia imagem menor que o limite", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    const canvas = desenharReduzido({} as CanvasImageSource, 640, 480);
    expect([canvas?.width, canvas?.height]).toEqual([640, 480]);
  });
});
