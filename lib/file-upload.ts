export const MAX_DOCUMENT_FILE_SIZE_MB = 50;
export const MAX_DOCUMENT_FILE_SIZE_BYTES =
  MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
];

export const DOCUMENT_FILE_TYPE_ERROR_MESSAGE =
  "Formato inválido. Envie apenas PDF, JPG, JPEG, PNG, DOC ou DOCX.";

export function hasAllowedDocumentExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export const UPLOAD_TIMEOUT_MS = 120_000;
