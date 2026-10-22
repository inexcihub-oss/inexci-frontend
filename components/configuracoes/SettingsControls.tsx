"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 w-full min-h-[52px] px-4 py-3 text-left text-sm font-medium text-gray-900 transition-all active:bg-gray-50",
        "lg:min-h-[44px] lg:rounded-xl lg:whitespace-nowrap lg:active:scale-[0.98]",
        active
          ? "lg:bg-primary-50 lg:text-primary-700 lg:border lg:border-primary-200"
          : "lg:text-gray-600 lg:hover:bg-gray-50 lg:hover:text-gray-900",
      )}
    >
      <Icon className="w-5 h-5 shrink-0 text-gray-500 lg:text-current" />
      <span className="flex-1">{label}</span>
      <ChevronRight
        className="w-4 h-4 shrink-0 text-gray-400 lg:hidden"
        aria-hidden="true"
      />
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary-600" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function NotificationItem({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 min-h-[56px]">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gray-100 rounded-xl">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={title} />
    </div>
  );
}

export function TabLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );
}

export function issuesToFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errs[field]) errs[field] = issue.message;
  }
  return errs;
}
