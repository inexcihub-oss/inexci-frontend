"use client";

import type { ReactNode } from "react";
import { SectionCard } from "@/components/shared/SectionCard";
import { cn } from "@/lib/utils";

export interface ReportColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface ReportTableProps<T> {
  title: string;
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  footer?: ReactNode[];
  action?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  emptyText?: string;
}

export function ReportTable<T>({
  title,
  columns,
  rows,
  rowKey,
  footer,
  action,
  isLoading = false,
  isError = false,
  emptyText = "Nenhum registro no período.",
}: ReportTableProps<T>) {
  return (
    <SectionCard title={title} headerAction={action}>
      {isLoading ? (
        <p className="px-4 py-4 text-sm text-gray-500">Carregando...</p>
      ) : isError ? (
        <p className="px-4 py-4 text-sm text-red-600">
          Não foi possível carregar o relatório.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <>
          <ul aria-label={`${title} (lista)`} className="divide-y divide-neutral-100 sm:hidden">
            {rows.map((row, index) => (
              <li key={rowKey(row, index)} className="px-4 py-3">
                <p className="text-sm font-semibold text-neutral-900">
                  {columns[0]?.render(row)}
                </p>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {columns.slice(1).map((col) => (
                    <div key={col.header} className="min-w-0">
                      <dt className="text-[11px] text-neutral-500">{col.header}</dt>
                      <dd className="text-xs font-medium text-neutral-800 tabular-nums">
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
            {footer && (
              <li className="bg-neutral-50 px-4 py-3">
                <p className="text-sm font-semibold text-neutral-900">{footer[0]}</p>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {columns.slice(1).map((col, index) =>
                    footer[index + 1] === "" || footer[index + 1] == null ? null : (
                      <div key={col.header} className="min-w-0">
                        <dt className="text-[11px] text-neutral-500">{col.header}</dt>
                        <dd className="text-xs font-semibold text-neutral-900 tabular-nums">
                          {footer[index + 1]}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </li>
            )}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm" aria-label={title}>
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  {columns.map((col) => (
                    <th
                      key={col.header}
                      scope="col"
                      className={cn(
                        "px-4 py-2 font-semibold whitespace-nowrap",
                        col.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {rows.map((row, index) => (
                  <tr key={rowKey(row, index)}>
                    {columns.map((col) => (
                      <td
                        key={col.header}
                        className={cn(
                          "px-4 py-2 text-neutral-800",
                          col.align === "right"
                            ? "text-right tabular-nums whitespace-nowrap"
                            : "text-left",
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {footer && (
                <tfoot>
                  <tr className="border-t border-neutral-100 font-semibold text-neutral-900">
                    {footer.map((cell, index) => (
                      <td
                        key={index}
                        className={cn(
                          "px-4 py-2",
                          columns[index]?.align === "right"
                            ? "text-right tabular-nums whitespace-nowrap"
                            : "text-left",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}
