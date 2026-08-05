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
 * Motivos de bloqueio comercial devolvidos pelo backend no corpo do HTTP 402
 * (`BillingRequiredException.reason`). `unknown` cobre um 402 sem `reason`
 * reconhecido — o aviso cai na cópia genérica usando a mensagem do servidor.
 */
export const BILLING_BLOCK_REASONS = [
  "quota_exceeded",
  "subscription_suspended",
  "subscription_canceled",
  "trial_expired",
  "payment_method_required",
] as const;

export type BillingBlockReason =
  | (typeof BILLING_BLOCK_REASONS)[number]
  | "unknown";

export interface BillingBlockError {
  reason: BillingBlockReason;
  /** Mensagem do backend, usada como fallback quando não há cópia específica. */
  message: string;
}

/**
 * Para bloqueios comerciais (HTTP 402 Payment Required): cota do plano
 * atingida, assinatura suspensa/cancelada, trial expirado.
 *
 * Retorna `null` quando o erro não é um 402 — aí o chamador segue com o
 * tratamento normal (toast, pendências etc.).
 */
export function getBillingBlockError(error: unknown): BillingBlockError | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 402) {
    return null;
  }

  const data = error.response?.data;
  const rawReason =
    data && typeof data === "object"
      ? (data as { reason?: unknown }).reason
      : undefined;

  const reason: BillingBlockReason = BILLING_BLOCK_REASONS.includes(
    rawReason as (typeof BILLING_BLOCK_REASONS)[number],
  )
    ? (rawReason as BillingBlockReason)
    : "unknown";

  // Deliberadamente não usa `getApiErrorMessage`: `AxiosError` estende
  // `Error`, então sem `message` no corpo a mensagem técnica do Axios
  // ("Request failed") vazaria para o aviso na tela.
  const rawMessage =
    data && typeof data === "object"
      ? (data as { message?: unknown }).message
      : undefined;

  const message =
    typeof rawMessage === "string" && rawMessage.trim()
      ? rawMessage
      : Array.isArray(rawMessage) && rawMessage.length > 0
        ? rawMessage.join(", ")
        : "Sua assinatura não permite esta ação no momento.";

  return { reason, message };
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
