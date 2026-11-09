import type { AdminInvoiceStatus } from "@/services/admin.service";

export const INVOICE_STATUS_META: Record<
  AdminInvoiceStatus,
  { label: string; className: string }
> = {
  paid: { label: "Paga", className: "bg-emerald-50 text-emerald-700" },
  open: { label: "Em aberto", className: "bg-amber-50 text-amber-700" },
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-600" },
  void: { label: "Anulada", className: "bg-gray-100 text-gray-600" },
  uncollectible: {
    label: "Incobrável",
    className: "bg-red-50 text-red-700",
  },
};

export const INVOICE_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos os status" },
  ...(Object.keys(INVOICE_STATUS_META) as AdminInvoiceStatus[]).map(
    (value) => ({ value, label: INVOICE_STATUS_META[value].label }),
  ),
];
