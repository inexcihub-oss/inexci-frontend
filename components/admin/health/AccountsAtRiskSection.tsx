import Link from "next/link";
import { ChevronRight, HeartPulse } from "lucide-react";
import { AdminSection } from "@/components/admin/AdminStatCard";
import type { AdminMetricsOverview } from "@/services/admin.service";

export const AT_RISK_LIST_HREF = "/admin/clientes?saude=risco&ordem=saude";

export function AccountsAtRiskSection({
  atRisk,
}: {
  atRisk: AdminMetricsOverview["accountsAtRisk"];
}) {
  return (
    <AdminSection
      title="Contas em risco"
      description="Nota de saúde abaixo de 40, da pior para a melhor"
      accent="red"
      action={
        atRisk.total > 0 ? (
          <Link href={AT_RISK_LIST_HREF} className="ds-toolbar-btn">
            Ver todas ({atRisk.total})
          </Link>
        ) : undefined
      }
    >
      {atRisk.items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <HeartPulse className="h-4 w-4 shrink-0" aria-hidden="true" />
          Nenhuma conta em risco agora.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
          {atRisk.items.map((item) => (
            <li key={item.ownerId}>
              <Link
                href={`/admin/clientes/${item.ownerId}`}
                aria-label={`${item.name}: nota ${item.score}`}
                className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-red-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:px-4"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-semibold text-red-700"
                >
                  {item.score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {item.mainReason ?? "Vários fatores somados"}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}
