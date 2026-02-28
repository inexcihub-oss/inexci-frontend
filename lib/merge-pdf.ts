import { PDFDocument } from "pdf-lib";

export interface DocumentEntry {
  uri: string;
  name: string;
}

/**
 * Busca todos os documentos fornecidos, mescla PDFs e incorpora imagens
 * (JPEG/PNG) em um único PDF e retorna o resultado como Blob.
 *
 * Tipos de arquivo suportados:
 * - PDF  → as páginas são copiadas diretamente
 * - JPEG / JPG → cada imagem ocupa uma página A4 em modo paisagem/retrato
 * - PNG  → idem
 *
 * Documentos que falham ao ser buscados ou processados são ignorados
 * silenciosamente (um aviso é emitido no console).
 */
export async function mergeDocumentsAsPdf(
  docs: DocumentEntry[],
): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const doc of docs) {
    try {
      const response = await fetch(doc.uri);

      if (!response.ok) {
        console.warn(
          `[merge-pdf] Falha ao buscar "${doc.name}" (${response.status})`,
        );
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const uriLower = doc.uri.toLowerCase().split("?")[0]; // remove query string
      const arrayBuffer = await response.arrayBuffer();

      const isPdf = contentType.includes("pdf") || uriLower.endsWith(".pdf");

      const isJpeg =
        contentType.includes("image/jpeg") ||
        contentType.includes("image/jpg") ||
        uriLower.endsWith(".jpg") ||
        uriLower.endsWith(".jpeg");

      const isPng =
        contentType.includes("image/png") || uriLower.endsWith(".png");

      if (isPdf) {
        const srcPdf = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
        });
        const pageIndices = srcPdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else if (isJpeg) {
        const image = await mergedPdf.embedJpg(arrayBuffer);
        const page = mergedPdf.addPage(fitImageToA4(image.width, image.height));
        const { width, height } = page.getSize();
        const scaled = image.scaleToFit(width, height);
        page.drawImage(image, {
          x: (width - scaled.width) / 2,
          y: (height - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      } else if (isPng) {
        const image = await mergedPdf.embedPng(arrayBuffer);
        const page = mergedPdf.addPage(fitImageToA4(image.width, image.height));
        const { width, height } = page.getSize();
        const scaled = image.scaleToFit(width, height);
        page.drawImage(image, {
          x: (width - scaled.width) / 2,
          y: (height - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      } else {
        console.warn(
          `[merge-pdf] Tipo de arquivo não suportado para "${doc.name}" (${contentType})`,
        );
      }
    } catch (err) {
      console.warn(`[merge-pdf] Erro ao processar "${doc.name}":`, err);
    }
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

/** A4 em pontos PDF (72 dpi): 595 × 842 */
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

/**
 * Retorna as dimensões da página em modo retrato ou paisagem,
 * escolhendo o melhor encaixe para a imagem.
 */
function fitImageToA4(imgWidth: number, imgHeight: number): [number, number] {
  const portrait: [number, number] = [A4_WIDTH, A4_HEIGHT];
  const landscape: [number, number] = [A4_HEIGHT, A4_WIDTH];

  // Usa paisagem se a imagem for mais larga do que alta
  if (imgWidth > imgHeight) return landscape;
  return portrait;
}
