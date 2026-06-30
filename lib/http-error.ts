import { AxiosError } from "axios";

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}

/**
 * Extrai mensagem legível de um erro de API (Axios ou genérico).
 * Lida com mensagens string e arrays (validação do NestJS).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro inesperado.",
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg)) return msg.join(", ");
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Para erros de transição de status bloqueados pelo backend (HTTP 400 com `pendencies[]`).
 * Retorna mensagem formatada incluindo a lista de pendências, ou null se não for esse tipo de erro.
 */
export function getTransitionBlockError(error: unknown): string | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 400)
    return null;
  const data = error.response?.data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { pendencies?: unknown }).pendencies) &&
    ((data as { pendencies: unknown[] }).pendencies.length ?? 0) > 0
  ) {
    const pendencies = (
      data as { pendencies: { key: string; name: string }[] }
    ).pendencies;
    const names = pendencies.map((p) => p.name).join(", ");
    const msg =
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Pendências não resolvidas.";
    return `${msg} Pendências: ${names}`;
  }
  return null;
}
