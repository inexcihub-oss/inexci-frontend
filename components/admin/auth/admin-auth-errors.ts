import { AxiosError } from "axios";

export const STEP_EXPIRED_MESSAGE =
  "A etapa de verificação expirou. Entre com seu e-mail e senha novamente.";

export const TOO_MANY_ATTEMPTS_MESSAGE =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

export function errorStatus(error: unknown): number | null {
  return error instanceof AxiosError ? (error.response?.status ?? null) : null;
}

export function isStepExpired(error: unknown): boolean {
  return errorStatus(error) === 401;
}

export function responseMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
      if (Array.isArray(message) && message.length > 0) {
        return message.join(", ");
      }
    }
  }
  return fallback;
}

export function codeErrorMessage(error: unknown): string {
  if (errorStatus(error) === 429) {
    return responseMessage(error, TOO_MANY_ATTEMPTS_MESSAGE);
  }
  return responseMessage(error, "Código inválido. Tente novamente.");
}
