"use client";

import type { ReactNode } from "react";

export function SecurityRow({
  icon: Icon,
  title,
  badge,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  badge?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 md:p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold text-gray-900">
              {title}
            </h3>
            {badge}
          </div>
          <div className="mt-1 text-sm text-gray-500">{description}</div>
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-14 sm:pl-0">
          {action}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      className={
        tone === "success"
          ? "inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"
          : "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
      }
    >
      {children}
    </span>
  );
}
