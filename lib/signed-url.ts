import { uploadService } from "@/services/upload.service";
import { logger } from "@/lib/logger";

export async function resolveSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try {
    return await uploadService.getSignedUrl(path);
  } catch (error) {
    logger.warn("Não foi possível gerar a URL assinada do arquivo:", error);
    return null;
  }
}
