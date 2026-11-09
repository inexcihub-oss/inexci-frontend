"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOBILE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface AdminColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headClassName?: string;
  mobile?: "title" | "subtitle" | "badge" | "field" | "full" | "hidden";
  mobileLabel?: string;
}

function onEnter(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter") action();
  };
}

export function AdminDataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowLabel,
  className,
  rowClassName,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const mobile = useMediaQuery(MOBILE_QUERY);

  if (!mobile) {
    return (
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              {...(onRowClick
                ? {
                    tabIndex: 0,
                    role: "link",
                    "aria-label": rowLabel?.(row),
                    onClick: () => onRowClick(row),
                    onKeyDown: onEnter(() => onRowClick(row)),
                  }
                : {})}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-gray-50",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const title = columns.find((c) => c.mobile === "title") ?? columns[0];
  const subtitles = columns.filter((c) => c.mobile === "subtitle");
  const badges = columns.filter((c) => c.mobile === "badge");
  const fields = columns.filter(
    (c) =>
      c !== title &&
      (c.mobile === undefined || c.mobile === "field" || c.mobile === "full"),
  );

  return (
    <ul className={cn("flex flex-col gap-2.5 p-3", className)}>
      {rows.map((row) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                {title.cell(row)}
                {subtitles.map((column) => (
                  <div
                    key={column.key}
                    className="mt-0.5 text-xs font-normal text-gray-500"
                  >
                    {column.cell(row)}
                  </div>
                ))}
              </div>
              {(badges.length > 0 || onRowClick) && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {badges.map((column) => (
                    <span key={column.key}>{column.cell(row)}</span>
                  ))}
                  {onRowClick && (
                    <ChevronRight
                      className="h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}
            </div>
            {fields.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-3">
                {fields.map((column) => (
                  <div
                    key={column.key}
                    className={cn(
                      "min-w-0",
                      column.mobile === "full" && "col-span-2",
                    )}
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      {column.mobileLabel ?? column.header}
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900 [overflow-wrap:anywhere]">
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        );
        return (
          <li
            key={rowKey(row)}
            {...(onRowClick
              ? {
                  tabIndex: 0,
                  role: "link",
                  "aria-label": rowLabel?.(row),
                  onClick: () => onRowClick(row),
                  onKeyDown: onEnter(() => onRowClick(row)),
                }
              : {})}
            className={cn(
              "rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm",
              onRowClick &&
                "cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              rowClassName?.(row),
            )}
          >
            {body}
          </li>
        );
      })}
    </ul>
  );
}
