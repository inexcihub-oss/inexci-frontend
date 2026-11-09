"use client";

import {
  ADMIN_FILTER_CONTROL,
  AdminFilterField,
  AdminFilters,
} from "@/components/admin/AdminFilters";
import {
  ERROR_PERIODS,
  ERROR_SOURCE_LABEL,
  ERROR_SOURCE_OPTIONS,
} from "@/lib/admin-errors";
import { cn } from "@/lib/utils";
import type {
  AdminErrorPeriodDays,
  AdminErrorSource,
} from "@/services/admin.service";

export function ErrorsFilters({
  days,
  source,
  onDaysChange,
  onSourceChange,
}: {
  days: AdminErrorPeriodDays;
  source: AdminErrorSource | undefined;
  onDaysChange: (days: AdminErrorPeriodDays) => void;
  onSourceChange: (source: AdminErrorSource | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
        <div role="group" aria-label="Período" className="ds-segmented">
          {ERROR_PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={days === p.days}
              onClick={() => onDaysChange(p.days)}
              className={cn(
                "ds-segmented-item whitespace-nowrap",
                days === p.days && "ds-segmented-item-active",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <AdminFilters
        className="border-0 p-0 lg:px-0"
        activeCount={source ? 1 : 0}
        summary={source ? ERROR_SOURCE_LABEL[source] : undefined}
        onClear={() => onSourceChange(undefined)}
      >
        <AdminFilterField label="Origem">
          <select
            aria-label="Origem"
            value={source ?? ""}
            onChange={(e) =>
              onSourceChange((e.target.value || undefined) as AdminErrorSource)
            }
            className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-40")}
          >
            <option value="">Todas as origens</option>
            {ERROR_SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ERROR_SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </AdminFilterField>
      </AdminFilters>
    </div>
  );
}
