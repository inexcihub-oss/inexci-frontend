"use client";

import type { ReactNode } from "react";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { MOBILE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export const ADMIN_FILTER_CONTROL = "ds-input w-full sm:w-auto md:h-9";

export function AdminFilters({
  children,
  activeCount = 0,
  summary,
  onClear,
  className,
}: {
  children: ReactNode;
  activeCount?: number;
  summary?: string;
  onClear?: () => void;
  className?: string;
}) {
  const mobile = useMediaQuery(MOBILE_QUERY);
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2.5 border-b border-neutral-100 px-3 py-2.5 lg:px-6",
        className,
      )}
    >
      <FinanceFilters
        activeCount={activeCount}
        summary={summary}
        onClear={onClear}
      >
        {mobile ? (
          <div className="flex flex-col gap-3">{children}</div>
        ) : (
          children
        )}
      </FinanceFilters>
    </div>
  );
}

export function AdminFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const mobile = useMediaQuery(MOBILE_QUERY);
  if (!mobile) return <>{children}</>;
  return (
    <div className="flex flex-col">
      <span className="ds-label" aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}
