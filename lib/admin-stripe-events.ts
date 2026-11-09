import type { AdminStripeEvent } from "@/services/admin.service";

export function stripeEventSituation(event: AdminStripeEvent): {
  label: string;
  className: string;
} {
  if (event.situation === "processed") {
    return { label: "Processado", className: "bg-emerald-50 text-emerald-700" };
  }
  if (event.situation === "failed") {
    return { label: "Erro", className: "bg-red-50 text-red-700" };
  }
  if (event.stale) {
    return {
      label: "Pendente há mais de 1 h",
      className: "bg-amber-100 text-amber-800",
    };
  }
  return { label: "Pendente", className: "bg-gray-100 text-gray-600" };
}

export function canReprocess(event: AdminStripeEvent): boolean {
  return event.situation !== "processed";
}
