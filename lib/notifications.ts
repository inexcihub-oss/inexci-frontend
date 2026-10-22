import {
  AlarmClock,
  AtSign,
  Bell,
  CircleArrowRight,
  FileClock,
  FilePlus2,
  FileX,
  Hourglass,
  ScanText,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/services/notification.service";

export type NotificationKind =
  | "new_surgery_request"
  | "status_update"
  | "pendency"
  | "expiring_document"
  | "action_by_user"
  | "mention"
  | "stale"
  | "stale_critical"
  | "document_extraction"
  | "document_extraction_error"
  | "info";

export type NotificationFilter = Exclude<
  NotificationKind,
  "stale_critical" | "document_extraction_error"
>;

export interface NotificationKindMeta {
  icon: LucideIcon;
  label: string;
  tile: string;
  chip: string;
}

export const NOTIFICATION_KIND_META: Record<
  NotificationKind,
  NotificationKindMeta
> = {
  new_surgery_request: {
    icon: FilePlus2,
    label: "Nova solicitação",
    tile: "bg-primary-50 text-primary-700",
    chip: "bg-primary-50 text-primary-700",
  },
  status_update: {
    icon: CircleArrowRight,
    label: "Mudança de status",
    tile: "bg-blue-50 text-blue-600",
    chip: "bg-blue-50 text-blue-700",
  },
  pendency: {
    icon: TriangleAlert,
    label: "Pendência",
    tile: "bg-amber-50 text-amber-600",
    chip: "bg-amber-50 text-amber-700",
  },
  expiring_document: {
    icon: FileClock,
    label: "Documento vencendo",
    tile: "bg-orange-50 text-orange-600",
    chip: "bg-orange-50 text-orange-700",
  },
  action_by_user: {
    icon: UserRound,
    label: "Ação da equipe",
    tile: "bg-violet-50 text-violet-600",
    chip: "bg-violet-50 text-violet-700",
  },
  mention: {
    icon: AtSign,
    label: "Menção",
    tile: "bg-teal-50 text-teal-600",
    chip: "bg-teal-50 text-teal-700",
  },
  stale: {
    icon: Hourglass,
    label: "Solicitação parada",
    tile: "bg-amber-50 text-amber-600",
    chip: "bg-amber-50 text-amber-700",
  },
  stale_critical: {
    icon: AlarmClock,
    label: "Ação imediata",
    tile: "bg-red-50 text-red-600",
    chip: "bg-red-50 text-red-700",
  },
  document_extraction: {
    icon: ScanText,
    label: "Análise de documento",
    tile: "bg-cyan-50 text-cyan-700",
    chip: "bg-cyan-50 text-cyan-700",
  },
  document_extraction_error: {
    icon: FileX,
    label: "Falha na análise",
    tile: "bg-red-50 text-red-600",
    chip: "bg-red-50 text-red-700",
  },
  info: {
    icon: Bell,
    label: "Informativo",
    tile: "bg-gray-100 text-gray-500",
    chip: "bg-gray-100 text-gray-600",
  },
};

export const NOTIFICATION_FILTERS: {
  value: "" | NotificationFilter;
  label: string;
}[] = [
  { value: "", label: "Todos os tipos" },
  { value: "new_surgery_request", label: "Nova solicitação" },
  { value: "status_update", label: "Mudança de status" },
  { value: "pendency", label: "Pendência" },
  { value: "stale", label: "Solicitação parada" },
  { value: "expiring_document", label: "Documento vencendo" },
  { value: "action_by_user", label: "Ação da equipe" },
  { value: "mention", label: "Menção" },
  { value: "document_extraction", label: "Análise de documento" },
  { value: "info", label: "Informativo" },
];

const metadataString = (
  notification: Notification,
  key: string,
): string | undefined => {
  const value = notification.metadata?.[key];
  return typeof value === "string" ? value : undefined;
};

export const isDocumentExtractionNotification = (notification: Notification) =>
  metadataString(notification, "category") === "document_extraction" ||
  /análise d[eo] documento/i.test(notification.title || "");

const isStaleNotification = (notification: Notification) =>
  notification.type === "stale" ||
  (notification.type === "system" &&
    (typeof notification.metadata?.staleDays === "number" ||
      /solicitação parada/i.test(notification.title || "")));

export function getNotificationKind(
  notification: Notification,
): NotificationKind {
  if (isDocumentExtractionNotification(notification)) {
    return metadataString(notification, "status") === "error" ||
      /falha/i.test(notification.title || "")
      ? "document_extraction_error"
      : "document_extraction";
  }
  if (isStaleNotification(notification)) {
    return metadataString(notification, "severity") === "critical" ||
      /ação imediata/i.test(notification.title || "")
      ? "stale_critical"
      : "stale";
  }
  if (notification.type in NOTIFICATION_KIND_META) {
    return notification.type as NotificationKind;
  }
  return "info";
}

export function getNotificationFilter(
  notification: Notification,
): NotificationFilter {
  const kind = getNotificationKind(notification);
  if (kind === "stale_critical") return "stale";
  if (kind === "document_extraction_error") return "document_extraction";
  return kind;
}

export const getNotificationMeta = (notification: Notification) =>
  NOTIFICATION_KIND_META[getNotificationKind(notification)];

export const cleanNotificationTitle = (title: string) =>
  title.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "").trim();

export const getNotificationDocumentName = (
  notification: Notification,
): string | null =>
  (
    metadataString(notification, "documentName") ??
    metadataString(notification, "fileName")
  )?.trim() || null;

export function getNotificationActor(notification: Notification) {
  if (notification.type !== "action_by_user") return null;
  const actorId = metadataString(notification, "actorId");
  const actorName = metadataString(notification, "actorName");
  const actorAvatarUrl = metadataString(notification, "actorAvatarUrl") ?? null;
  if (!actorId && !actorName && !actorAvatarUrl) return null;
  return { actorId, actorName, actorAvatarUrl };
}

export const normalizeNotificationLink = (link: string) =>
  link.replace(/\/solicitac[^\\/]*\//, "/solicitacao/");

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const daysBetween = (date: Date, now: Date) =>
  Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);

const hourMinute = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export function formatNotificationTime(
  date: Date,
  now: Date = new Date(),
): string {
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  const days = daysBetween(date, now);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60 && days === 0) return `há ${diffMinutes} min`;
  if (days === 0) return `há ${Math.floor(diffMinutes / 60)} h`;
  if (days === 1) return `ontem, ${hourMinute(date)}`;
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
    }).format(date);
    return `${weekday} ${hourMinute(date)}`;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export const formatNotificationFullDate = (date: Date) =>
  Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(date);
