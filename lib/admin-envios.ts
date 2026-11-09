import type {
  NotificationChannel,
  NotificationLogStatsRow,
  NotificationSendStatus,
} from "@/services/admin.service";

export const ENVIO_CHANNELS: NotificationChannel[] = ["email", "whatsapp"];

export const ENVIO_STATUSES: NotificationSendStatus[] = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
];

export const ENVIO_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
};

export const ENVIO_STATUS_LABEL: Record<NotificationSendStatus, string> = {
  queued: "Na fila",
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  failed: "Falhou",
};

export const ENVIO_STATUS_CLASS: Record<NotificationSendStatus, string> = {
  queued: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  read: "bg-teal-50 text-teal-700",
  failed: "bg-red-50 text-red-700",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value.trim());
}

export function isChannel(value: string): value is NotificationChannel {
  return (ENVIO_CHANNELS as string[]).includes(value);
}

export function isSendStatus(value: string): value is NotificationSendStatus {
  return (ENVIO_STATUSES as string[]).includes(value);
}

export type ChannelTotals = Record<NotificationSendStatus, number> & {
  total: number;
};

export function totalsByChannel(
  rows: NotificationLogStatsRow[],
): Record<NotificationChannel, ChannelTotals> {
  const empty = (): ChannelTotals => ({
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    total: 0,
  });
  const result: Record<NotificationChannel, ChannelTotals> = {
    email: empty(),
    whatsapp: empty(),
  };
  for (const row of rows) {
    const bucket = result[row.channel];
    if (!bucket) continue;
    bucket[row.status] += row.count;
    bucket.total += row.count;
  }
  return result;
}
