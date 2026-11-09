export type AiSource =
  "whatsapp" | "document_extraction" | "rag_embedding" | "rag_ingestion";

export const AI_SOURCE_LABELS: Record<AiSource, string> = {
  whatsapp: "WhatsApp",
  document_extraction: "Extração de documento",
  rag_embedding: "Busca na base (RAG)",
  rag_ingestion: "Ingestão da base",
};

export const AI_SOURCES = Object.keys(AI_SOURCE_LABELS) as AiSource[];

export function recordsLabel(source: AiSource | ""): {
  plural: string;
  singular: string;
} {
  if (source === "whatsapp")
    return { plural: "Mensagens", singular: "mensagem" };
  if (source === "document_extraction")
    return { plural: "Extrações", singular: "extração" };
  return { plural: "Registros de uso", singular: "registro" };
}

export function projectMonthCostCents(
  costCents: number,
  todayISO: string,
): number {
  const [year, month, day] = todayISO.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.round((costCents / day) * daysInMonth);
}

export function previousRange(range: { from: string; to: string }): {
  from: string;
  to: string;
} {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  return {
    from: new Date(from - (to - from)).toISOString(),
    to: new Date(from).toISOString(),
  };
}

export function formatVariation(
  current: number,
  previous: number | undefined,
): { label: string; direction: "up" | "down" | "neutral" } {
  if (!previous) {
    return current > 0
      ? { label: "novo", direction: "neutral" }
      : { label: "—", direction: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: "0%", direction: "neutral" };
  return pct > 0
    ? { label: `+${pct}%`, direction: "up" }
    : { label: `${pct}%`, direction: "down" };
}
