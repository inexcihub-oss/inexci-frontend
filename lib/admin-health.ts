import type { AdminAccountItem } from "@/services/admin.service";

export type AdminHealthBand = NonNullable<AdminAccountItem["health"]>["band"];

export const HEALTH_BANDS: AdminHealthBand[] = ["healthy", "attention", "risk"];

export const HEALTH_META: Record<
  AdminHealthBand,
  {
    label: string;
    param: string;
    badge: string;
    dot: string;
    accent: "emerald" | "amber" | "red";
  }
> = {
  healthy: {
    label: "Saudável",
    param: "saudavel",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    accent: "emerald",
  },
  attention: {
    label: "Atenção",
    param: "atencao",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    accent: "amber",
  },
  risk: {
    label: "Em risco",
    param: "risco",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    dot: "bg-red-500",
    accent: "red",
  },
};

export const HEALTH_NO_SCORE_HINT =
  "Sem nota: conta cancelada, desativada ou ainda não avaliada";

export function healthBandFromParam(
  value: string | null,
): AdminHealthBand | undefined {
  return HEALTH_BANDS.find((band) => HEALTH_META[band].param === value);
}
