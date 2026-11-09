import {
  SECURITY_EVENT_CLASS,
  SECURITY_EVENT_LABEL,
  SECURITY_EVENT_ORDER,
} from "@/lib/admin-security";
import { cn } from "@/lib/utils";
import type { AdminSecurityTotals } from "@/services/admin.service";

export function SecurityEventBreakdown({
  totals,
}: {
  totals: AdminSecurityTotals;
}) {
  return (
    <ul
      aria-label="Eventos por tipo"
      className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4"
    >
      {SECURITY_EVENT_ORDER.map((type) => (
        <li
          key={type}
          className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2"
        >
          <span
            className={cn(
              "ds-badge-sm whitespace-nowrap",
              SECURITY_EVENT_CLASS[type],
            )}
          >
            {SECURITY_EVENT_LABEL[type]}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {totals[type]}
          </span>
        </li>
      ))}
    </ul>
  );
}
