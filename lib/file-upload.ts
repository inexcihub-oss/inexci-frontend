/**
 * Limite de tamanho por arquivo para upload de documentos (SC, prontuário,
 * laudo). Espelha `STORAGE_FOLDER_SIZE_LIMITS` do backend
 * (`inexci-api/src/config/storage.config.ts`, pastas `documents`,
 * `post-surgical` e `report`) — mude os dois lados juntos.
 */
export const MAX_DOCUMENT_FILE_SIZE_MB = 50;
export const MAX_DOCUMENT_FILE_SIZE_BYTES =
  MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;

/**
 * Timeout para requisições de upload de arquivo. O `api` (lib/api.ts) usa
 * 30s como padrão global, curto demais para 50MB em upload de conexão lenta
 * (móvel/hospital); as chamadas de upload passam este valor por requisição.
 */
export const UPLOAD_TIMEOUT_MS = 120_000;
