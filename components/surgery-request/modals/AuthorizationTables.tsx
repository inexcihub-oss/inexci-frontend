"use client";

import React from "react";

export interface AuthorizationEntry {
  id: string | number;
  quantity: number;
  authorizedQuantity: string;
}

export interface SupplierSelectOption {
  value: string;
  label: string;
}

function getSummaryRowStyles(
  authorized: number | null,
  requested: number,
): { row: string; authorizedBox: string } {
  if (authorized === null) {
    return {
      row: "",
      authorizedBox: "bg-white border-gray-200 text-gray-500",
    };
  }

  if (authorized === 0) {
    return {
      row: "bg-rose-100/90 border-l-4 border-l-rose-500",
      authorizedBox: "bg-rose-50 border-rose-300 text-rose-700",
    };
  }

  if (authorized < requested) {
    return {
      row: "bg-amber-100/90 border-l-4 border-l-amber-500",
      authorizedBox: "bg-amber-50 border-amber-300 text-amber-700",
    };
  }

  return {
    row: "bg-emerald-100/90 border-l-4 border-l-emerald-500",
    authorizedBox: "bg-emerald-50 border-emerald-300 text-emerald-700",
  };
}

interface AuthorizationTableProps {
  items: AuthorizationEntry[];
  labelHeader: string;
  renderLabel: (item: AuthorizationEntry) => string;
  onChange: (id: string | number, value: string) => void;
  getSupplierOptions?: (item: AuthorizationEntry) => SupplierSelectOption[];
  getSelectedSupplier?: (id: string | number) => string;
  onSupplierChange?: (id: string | number, value: string) => void;
}

export function AuthorizationTable({
  items,
  labelHeader,
  renderLabel,
  onChange,
  getSupplierOptions,
  getSelectedSupplier,
  onSupplierChange,
}: AuthorizationTableProps) {
  const showSupplierSelect =
    !!getSupplierOptions && !!getSelectedSupplier && !!onSupplierChange;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="md:hidden">
        <div className="px-4 py-2 border-b border-gray-200">
          <span className="text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
        </div>
        {items.map((item) => {
          const supplierOptions = getSupplierOptions?.(item) ?? [];
          const selectedSupplier = getSelectedSupplier?.(item.id) ?? "";

          return (
            <div
              key={item.id}
              className="px-4 py-3 border-b border-gray-200 last:border-b-0 space-y-2.5"
            >
              <p className="text-sm text-gray-900 leading-snug break-words">
                {renderLabel(item)}
              </p>

              {showSupplierSelect && (
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Fornecedor
                  </label>
                  {supplierOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {supplierOptions.map((supplier) => {
                        const isSelected = selectedSupplier === supplier.value;
                        return (
                          <button
                            key={supplier.value}
                            type="button"
                            onClick={() =>
                              onSupplierChange?.(item.id, supplier.value)
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-xs leading-tight transition-colors ${
                              isSelected
                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            {supplier.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ds-field-readonly text-xs text-gray-400">
                      Sem fornecedores disponíveis
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Solicitada
                  </label>
                  <div className="h-10 flex items-center justify-center border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 bg-white">
                    {item.quantity}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Autorizada
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={item.authorizedQuantity}
                    onChange={(e) => {
                      const rawValue = e.target.value;

                      if (rawValue === "") {
                        onChange(item.id, "");
                        return;
                      }

                      const parsed = Number(rawValue);
                      if (!Number.isFinite(parsed)) return;

                      const clamped = Math.min(
                        item.quantity,
                        Math.max(0, parsed),
                      );
                      onChange(item.id, String(clamped));
                    }}
                    className="ds-input h-10 w-full !px-0 text-center font-semibold appearance-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="flex items-center gap-2 px-4 py-1 border-b border-gray-200">
          <span className="flex-1 text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
          {showSupplierSelect && (
            <div className="w-44 flex justify-center">
              <span className="text-xs text-gray-900 opacity-50 text-center">
                Fornecedor
              </span>
            </div>
          )}
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Solicitada
            </span>
          </div>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Autorizada
            </span>
          </div>
        </div>
        {items.map((item) => {
          const supplierOptions = getSupplierOptions?.(item) ?? [];
          const selectedSupplier = getSelectedSupplier?.(item.id) ?? "";

          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0"
            >
              <span className="flex-1 min-w-0 text-xs md:text-sm text-gray-900 leading-snug break-words">
                {renderLabel(item)}
              </span>
              {showSupplierSelect && (
                <div className="w-44 flex justify-center">
                  <div className="relative w-full">
                    <select
                      value={selectedSupplier}
                      onChange={(e) =>
                        onSupplierChange?.(item.id, e.target.value)
                      }
                      disabled={supplierOptions.length === 0}
                      className="ds-input h-10 w-full text-xs md:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Selecionar</option>
                      {supplierOptions.map((supplier) => (
                        <option key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="w-24 flex justify-center">
                <div className="w-14 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-500">
                  {item.quantity}
                </div>
              </div>
              <div className="w-24 flex justify-center">
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={item.authorizedQuantity}
                  onChange={(e) => {
                    const rawValue = e.target.value;

                    if (rawValue === "") {
                      onChange(item.id, "");
                      return;
                    }

                    const parsed = Number(rawValue);
                    if (!Number.isFinite(parsed)) return;

                    const clamped = Math.min(
                      item.quantity,
                      Math.max(0, parsed),
                    );
                    onChange(item.id, String(clamped));
                  }}
                  className="ds-input w-14 h-10 !px-0 text-center font-semibold appearance-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SummaryTableProps {
  labelHeader: string;
  items: { label: string; requested: number; authorized: number | null }[];
}

export function SummaryTable({ labelHeader, items }: SummaryTableProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="md:hidden">
        <div className="px-4 py-2 border-b border-gray-200">
          <span className="text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
        </div>
        {items.map((item, index) => {
          const styles = getSummaryRowStyles(item.authorized, item.requested);

          return (
            <div
              key={index}
              className={`px-4 py-3 border-b border-gray-200 last:border-b-0 space-y-2 ${styles.row}`}
            >
              <p className="text-sm text-gray-900 leading-snug break-words">
                {item.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Solicitada
                  </label>
                  <div className="h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500">
                    {item.requested}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">
                    Qnt. Autorizada
                  </label>
                  <div
                    className={`h-10 flex items-center justify-center border rounded-xl text-sm font-semibold ${styles.authorizedBox}`}
                  >
                    {item.authorized ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="flex items-center gap-2 px-4 py-1 border-b border-gray-200">
          <span className="flex-1 text-xs text-gray-900 opacity-50">
            {labelHeader}
          </span>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Solicitada
            </span>
          </div>
          <div className="w-24 flex justify-center">
            <span className="text-xs text-gray-900 opacity-50 text-center">
              Qnt. Autorizada
            </span>
          </div>
        </div>
        {items.map((item, index) => {
          const styles = getSummaryRowStyles(item.authorized, item.requested);

          return (
            <div
              key={index}
              className={`flex items-center gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0 ${styles.row}`}
            >
              <span className="flex-1 text-xs md:text-sm text-gray-900 leading-snug">
                {item.label}
              </span>
              <div className="w-24 flex justify-center">
                <div className="w-14 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-500">
                  {item.requested}
                </div>
              </div>
              <div className="w-24 flex justify-center">
                <div
                  className={`w-14 h-10 flex items-center justify-center border rounded-xl text-xs md:text-sm font-semibold ${styles.authorizedBox}`}
                >
                  {item.authorized ?? "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
