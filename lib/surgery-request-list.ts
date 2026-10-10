import type { SurgeryRequestListItem } from "@/services/surgery-request.service";

export function surgeryRequestListName(
  item: Pick<
    SurgeryRequestListItem,
    "isIndication" | "indicationName" | "procedure"
  >,
  fallback = "Procedimento não especificado",
): string {
  if (item.isIndication && item.indicationName) return item.indicationName;
  return item.procedure?.name || item.indicationName || fallback;
}
