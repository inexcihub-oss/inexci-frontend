/** Mesmo teto e mesmos tipos que o backend aceita na pasta `patient-photos`. */
export const PATIENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PATIENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Maior lado da foto que sai do navegador (câmera ou arquivo reduzido): o
 * backend reduz para 800 px de qualquer jeito.
 */
export const LADO_MAX_FOTO = 1280;

const MENSAGEM_TIPO = "Envie uma imagem JPG, PNG ou WEBP.";
const MENSAGEM_TAMANHO = "A foto deve ter no máximo 2 MB.";

/** Mensagem do problema com o arquivo, ou `null` se ele pode ser enviado. */
export function validarFotoPaciente(file: File): string | null {
  if (!PATIENT_PHOTO_TYPES.includes(file.type)) return MENSAGEM_TIPO;
  if (file.size > PATIENT_PHOTO_MAX_BYTES) return MENSAGEM_TAMANHO;
  return null;
}

/**
 * Desenha `fonte` num canvas com o maior lado limitado a `ladoMax` (nunca
 * amplia). Usado pela captura da câmera e pela redução de arquivo grande.
 * `fundo` pinta o canvas antes — PNG com transparência viraria fundo preto no
 * JPEG.
 */
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

/**
 * Arquivo de imagem → JPEG de no máximo `LADO_MAX_FOTO` px. `null` se o
 * navegador não conseguir decodificar (ou não tiver `createImageBitmap`): aí
 * quem chama recusa como antes. `imageOrientation: "from-image"` aplica o
 * EXIF — foto de celular não sai deitada.
 */
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

/**
 * Valida e, se passar de 2 MB, reduz a foto no navegador antes de enviar. Só
 * recusa por tamanho se nem reduzida ela couber (ou se não der para reduzir).
 */
export async function prepararFotoPaciente(
  file: File,
): Promise<
  { foto: File; erro?: undefined } | { foto?: undefined; erro: string }
> {
  if (!PATIENT_PHOTO_TYPES.includes(file.type)) return { erro: MENSAGEM_TIPO };
  if (file.size <= PATIENT_PHOTO_MAX_BYTES) return { foto: file };
  const reduzida = await reduzirFoto(file);
  if (reduzida && reduzida.size <= PATIENT_PHOTO_MAX_BYTES) {
    return { foto: reduzida };
  }
  return { erro: MENSAGEM_TAMANHO };
}
