import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PATIENT_PHOTO_MAX_BYTES,
  assinaturaDeImagemConfere,
  desenharReduzido,
  prepararFotoPaciente,
} from "./foto-paciente";
import { arquivoDeImagem } from "./foto-paciente.fixtures";

const arquivo = (nome: string, tipo: string, bytes = 10) =>
  arquivoDeImagem(nome, tipo, bytes);

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

  it("conteúdo que não é JPG/PNG/WEBP (ex.: PDF renomeado para .png) é recusado", async () => {
    const { toBlob } = navegadorFalso(10);
    const pdfComoPng = new File(
      [new TextEncoder().encode("%PDF-1.7 ...")],
      "laudo.png",
      { type: "image/png" },
    );
    const r = await prepararFotoPaciente(pdfComoPng);
    expect(r.erro).toMatch(/não é uma imagem JPG, PNG ou WEBP válida/);
    expect(toBlob).not.toHaveBeenCalled();
  });

  it.each([
    ["a.jpg", "image/jpeg"],
    ["a.jpg", "image/jpg"],
    ["a.png", "image/png"],
    ["a.webp", "image/webp"],
  ])("aceita %s (%s) com a assinatura correta", async (nome, tipo) => {
    const f = arquivoDeImagem(nome, tipo);
    await expect(prepararFotoPaciente(f)).resolves.toEqual({ foto: f });
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

describe("assinaturaDeImagemConfere", () => {
  it("reconhece JPEG, PNG e WEBP e recusa o resto", async () => {
    await expect(
      assinaturaDeImagemConfere(arquivoDeImagem("a", "image/jpeg")),
    ).resolves.toBe(true);
    await expect(
      assinaturaDeImagemConfere(arquivoDeImagem("a", "image/png")),
    ).resolves.toBe(true);
    await expect(
      assinaturaDeImagemConfere(arquivoDeImagem("a", "image/webp")),
    ).resolves.toBe(true);
    // GIF e RIFF que não é WEBP (ex.: WAV)
    await expect(
      assinaturaDeImagemConfere(new Blob([new TextEncoder().encode("GIF89a")])),
    ).resolves.toBe(false);
    await expect(
      assinaturaDeImagemConfere(
        new Blob([new TextEncoder().encode("RIFF\0\0\0\0WAVE")]),
      ),
    ).resolves.toBe(false);
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
