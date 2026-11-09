import {
  AtSign,
  Bot,
  Copy,
  FileText,
  Mail,
  MessageCircle,
  ScanText,
  type LucideIcon,
} from "lucide-react";
import type { AdminQueueName } from "@/services/admin.service";

export const QUEUE_ICON: Record<AdminQueueName, LucideIcon> = {
  mail: Mail,
  "whatsapp-messages": MessageCircle,
  "pdf-generation": FileText,
  "ai-messages": Bot,
  "document-extraction": ScanText,
  "indication-documents": Copy,
  "mention-emails": AtSign,
};

export const QUEUE_NAMES = Object.keys(QUEUE_ICON) as AdminQueueName[];

export function parseQueueName(
  value: string | null,
): AdminQueueName | undefined {
  return QUEUE_NAMES.find((name) => name === value);
}

export function attemptsLabel(made: number, max: number | null): string {
  if (max === null) return `${made} ${made === 1 ? "tentativa" : "tentativas"}`;
  return `${made} de ${max} ${max === 1 ? "tentativa" : "tentativas"}`;
}
