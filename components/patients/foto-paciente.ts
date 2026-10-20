export const PATIENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PATIENT_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const LADO_MAX_FOTO = 1280;

const MENSAGEM_TIPO = "Envie uma imagem JPG, PNG ou WEBP.";
const MENSAGEM_TAMANHO = "A foto deve ter no máximo 2 MB.";
const MENSAGEM_CONTEUDO =
  "O arquivo não é uma imagem JPG, PNG ou WEBP válida (a extensão não confere com o conteúdo). Escolha outra foto.";

async function lerInicio(file: Blob, n: number): Promise<Uint8Array | null> {
  const fatia = file.slice(0, n);
  try {
    if (typeof fatia.arrayBuffer === "function") {
      return new Uint8Array(await fatia.arrayBuffer());
    }
    if (typeof FileReader === "undefined") return null;
    return await new Promise<Uint8Array | null>((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () =>
        resolve(
          leitor.result instanceof ArrayBuffer
            ? new Uint8Array(leitor.result)
            : null,
        );
      leitor.onerror = () => resolve(null);
      leitor.readAsArrayBuffer(fatia);
    });
  } catch {
    return null;
  }
}

const comeca = (b: Uint8Array, assinatura: number[], desde = 0) =>
  assinatura.every((v, i) => b[desde + i] === v);

export async function assinaturaDeImagemConfere(file: Blob): Promise<boolean> {
  const b = await lerInicio(file, 12);
  if (!b) return true;
  if (comeca(b, [0xff, 0xd8, 0xff])) return true;
  if (comeca(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  if (
    comeca(b, [0x52, 0x49, 0x46, 0x46]) &&
    comeca(b, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return true;
  return false;
}

export function validarFotoPaciente(file: File): string | null {
  if (!PATIENT_PHOTO_TYPES.includes(file.type)) return MENSAGEM_TIPO;
  if (file.size > PATIENT_PHOTO_MAX_BYTES) return MENSAGEM_TAMANHO;
  return null;
}

export function desenharReduzido(
  fonte: CanvasImageSource,
  largura: number,
  altura: number,
  { ladoMax = LADO_MAX_FOTO, fundo }: { ladoMax?: number; fundo?: string } = {},
): HTMLCanvasElement | null {
  if (!largura || !altura) return null;
  const escala = Math.min(1, ladoMax / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largura * escala);
  canvas.height = Math.round(altura * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (fundo) {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function reduzirFoto(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const canvas = desenharReduzido(bitmap, bitmap.width, bitmap.height, {
      fundo: "#fff",
    });
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return null;
    const base = file.name.replace(/\.[^./\\]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close?.();
  }
}

export async function prepararFotoPaciente(
  file: File,
): Promise<
  { foto: File; erro?: undefined } | { foto?: undefined; erro: string }
> {
  if (!PATIENT_PHOTO_TYPES.includes(file.type)) return { erro: MENSAGEM_TIPO };
  if (!(await assinaturaDeImagemConfere(file))) {
    return { erro: MENSAGEM_CONTEUDO };
  }
  if (file.size <= PATIENT_PHOTO_MAX_BYTES) return { foto: file };
  const reduzida = await reduzirFoto(file);
  if (reduzida && reduzida.size <= PATIENT_PHOTO_MAX_BYTES) {
    return { foto: reduzida };
  }
  return { erro: MENSAGEM_TAMANHO };
}
