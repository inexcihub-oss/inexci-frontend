import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminStatTone = "default" | "positive" | "warning" | "danger";
export type AdminStatTrend = "up" | "down" | "neutral";
export type AdminAccent =
  "teal" | "emerald" | "blue" | "violet" | "amber" | "red" | "slate";

export const ACCENT_STYLES: Record<
  AdminAccent,
  { card: string; chip: string; footnote: string; bar: string }
> = {
  teal: {
    card: "border-teal-100 bg-gradient-to-br from-teal-50 via-white to-white",
    chip: "bg-teal-100 text-teal-700",
    footnote: "border-teal-100",
    bar: "bg-teal-500",
  },
  emerald: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white",
    chip: "bg-emerald-100 text-emerald-700",
    footnote: "border-emerald-100",
    bar: "bg-emerald-500",
  },
  blue: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white",
    chip: "bg-blue-100 text-blue-700",
    footnote: "border-blue-100",
    bar: "bg-blue-500",
  },
  violet: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white",
    chip: "bg-violet-100 text-violet-700",
    footnote: "border-violet-100",
    bar: "bg-violet-500",
  },
  amber: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white",
    chip: "bg-amber-100 text-amber-700",
    footnote: "border-amber-100",
    bar: "bg-amber-500",
  },
  red: {
    card: "border-red-100 bg-gradient-to-br from-red-50 via-white to-white",
    chip: "bg-red-100 text-red-700",
    footnote: "border-red-100",
    bar: "bg-red-500",
  },
  slate: {
    card: "border-gray-200 bg-gradient-to-br from-gray-50 via-white to-white",
    chip: "bg-gray-100 text-gray-600",
    footnote: "border-gray-100",
    bar: "bg-gray-400",
  },
};

const VALUE_TONE: Record<AdminStatTone, string> = {
  default: "text-gray-900",
  positive: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

const TREND_TONE: Record<AdminStatTrend, string> = {
  up: "bg-white text-emerald-700 ring-1 ring-emerald-200",
  down: "bg-white text-red-700 ring-1 ring-red-200",
  neutral: "bg-white text-gray-600 ring-1 ring-gray-200",
};

const TREND_ARROW: Record<AdminStatTrend, string> = {
  up: "↑",
  down: "↓",
  neutral: "",
};

export function AdminIconChip({
  icon: Icon,
  accent,
  size = "md",
}: {
  icon: LucideIcon;
  accent: AdminAccent;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        ACCENT_STYLES[accent].chip,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </span>
  );
}

export function AdminStatTrendBadge({
  trend,
  children,
}: {
  trend: AdminStatTrend;
  children: ReactNode;
}) {
  return (
    <span className={cn("ds-badge-sm shrink-0 gap-0.5", TREND_TONE[trend])}>
      {TREND_ARROW[trend] && (
        <span aria-hidden="true">{TREND_ARROW[trend]}</span>
      )}
      {children}
    </span>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  footnote,
  badge,
  icon,
  accent = "slate",
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  footnote?: ReactNode;
  badge?: ReactNode;
  icon?: LucideIcon;
  accent?: AdminAccent;
  tone?: AdminStatTone;
  className?: string;
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-2xl border p-3.5 shadow-sm sm:p-4",
        styles.card,
        className,
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <AdminIconChip icon={icon} accent={accent} />}
          <p className="text-xs font-medium text-gray-600 sm:text-sm">
            {label}
          </p>
        </div>
        {badge}
      </div>
      <div
        className={cn(
          "mt-2 break-words text-xl font-semibold tracking-tight sm:text-2xl",
          VALUE_TONE[tone],
        )}
      >
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {footnote && (
        <div className="mt-auto pt-3">
          <div
            className={cn(
              "border-t pt-2.5 text-xs text-gray-600",
              styles.footnote,
            )}
          >
            {footnote}
          </div>
        </div>
      )}
    </div>
  );
}

const GRID_COLUMNS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
} as const;

export function AdminStatGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: keyof typeof GRID_COLUMNS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2",
        GRID_COLUMNS[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  action,
  accent,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: AdminAccent;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex items-stretch gap-2.5">
          {accent && (
            <span
              aria-hidden="true"
              className={cn(
                "w-1 shrink-0 rounded-full",
                ACCENT_STYLES[accent].bar,
              )}
            />
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 md:text-base">
              {title}
            </h2>
            {description && <p className="ds-caption">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
