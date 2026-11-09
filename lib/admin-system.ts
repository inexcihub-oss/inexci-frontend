import { pluralize } from "@/lib/admin-format";
import type {
  NotificationHealthChannel,
  NotificationHealthIndicator,
  NotificationsHealth,
  SystemJobKey,
} from "@/services/admin.service";

export const HEALTH_CHANNELS: Array<{
  key: NotificationHealthChannel;
  label: string;
  description: string;
}> = [
  {
    key: "redis",
    label: "Redis e filas",
    description: "Filas de e-mail, WhatsApp, PDF e IA",
  },
  {
    key: "smtp",
    label: "E-mail (SMTP)",
    description: "Envio de e-mails pela Brevo",
  },
  {
    key: "twilio",
    label: "WhatsApp (Twilio)",
    description: "Mensagens e templates do WhatsApp",
  },
];

export type ChannelState = "up" | "down" | "unknown";

export interface ChannelHealth {
  state: ChannelState;
  message: string | null;
}

function indicatorMessage(
  indicator: NotificationHealthIndicator | undefined,
): string | null {
  if (!indicator) return null;
  if (typeof indicator.message === "string" && indicator.message.trim()) {
    return indicator.message;
  }
  if (typeof indicator.error === "string" && indicator.error.trim()) {
    return indicator.error;
  }
  return null;
}

export function channelHealth(
  health: NotificationsHealth | undefined,
  key: NotificationHealthChannel,
): ChannelHealth {
  const indicator =
    health?.details?.[key] ?? health?.error?.[key] ?? health?.info?.[key];
  if (!indicator) return { state: "unknown", message: null };
  if (indicator.status === "up") return { state: "up", message: null };
  return { state: "down", message: indicatorMessage(indicator) };
}

export function jobCountMessage(key: SystemJobKey, count: number): string {
  return key === "stale_requests"
    ? pluralize(count, "aviso enviado", "avisos enviados")
    : pluralize(count, "resumo enviado", "resumos enviados");
}

function countFromResult(key: SystemJobKey, result: unknown): number | null {
  if (typeof result === "number") return result;
  if (result && typeof result === "object") {
    const field = key === "stale_requests" ? "notified" : "dispatched";
    const value = (result as Record<string, unknown>)[field];
    if (typeof value === "number") return value;
  }
  return null;
}

export function formatJobResult(key: SystemJobKey, result: unknown): string {
  const count = countFromResult(key, result);
  if (count !== null) return jobCountMessage(key, count);
  if (typeof result === "string" && result.trim()) return result;
  return "—";
}
