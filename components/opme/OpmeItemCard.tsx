"use client";

import React, { useCallback, useMemo } from "react";
import {
  ChevronDown,
  Copy,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Package,
  Check,
  AlertCircle,
} from "lucide-react";
import type { OpmeSupplier } from "@/services/opme.service";
import type { Manufacturer } from "@/services/manufacturer.service";
import { CatalogAutocomplete } from "./CatalogAutocomplete";
import {
  MIN_OPTIONS,
  OpmeItemForm,
  SupplierOption,
  normalizeOptionName,
} from "./opme-form";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 md:py-10 px-4 gap-3">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 text-primary-700">
        <Package className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="text-sm md:text-base font-semibold text-gray-900">
          Nenhum material adicionado
        </h3>
        <p className="ds-caption">
          Use o campo acima para adicionar os materiais OPME necessários para
          esta solicitação.
        </p>
      </div>
    </div>
  );
}

export function AddOpmeRow({
  value,
  onChange,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const canAdd = value.trim().length > 0;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white p-1.5 pl-3 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-colors">
      <Plus className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
          }
        }}
        placeholder="Nome do material..."
        aria-label="Nome do material OPME"
        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 py-1.5"
      />
      <button
        type="button"
        onClick={onConfirm}
        disabled={!canAdd}
        className="ds-btn-primary h-8 md:h-9 min-h-0 inline-flex items-center gap-1.5 shrink-0"
      >
        <Check className="w-4 h-4" strokeWidth={2} />
        <span className="hidden sm:inline">Adicionar</span>
      </button>
    </div>
  );
}

interface OpmeItemCardProps {
  item: OpmeItemForm;
  expanded: boolean;
  isEditingName: boolean;
  availableSuppliers: OpmeSupplier[];
  availableManufacturers: Manufacturer[];
  onToggleExpand: () => void;
  onStartEditName: () => void;
  onFinishEditName: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onQuantityDelta: (delta: number) => void;
  onQuantitySet: (value: string) => void;
  onManufacturerChange: (index: number, value: string) => void;
  onAddManufacturer: () => void;
  onRemoveManufacturer: (index: number) => void;
  onSupplierChange: (index: number, value: SupplierOption) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (index: number) => void;
}

export function OpmeItemCard({
  item,
  expanded,
  isEditingName,
  availableSuppliers,
  availableManufacturers,
  onToggleExpand,
  onStartEditName,
  onFinishEditName,
  onRename,
  onDuplicate,
  onRemove,
  onQuantityDelta,
  onQuantitySet,
  onManufacturerChange,
  onAddManufacturer,
  onRemoveManufacturer,
  onSupplierChange,
  onAddSupplier,
  onRemoveSupplier,
}: OpmeItemCardProps) {
  const filledManufacturers = useMemo(
    () => item.manufacturers.filter((m) => m.trim()).length,
    [item.manufacturers],
  );
  const filledSuppliers = useMemo(
    () => item.suppliers.filter((s) => s.name.trim()).length,
    [item.suppliers],
  );

  const getAvailableSuppliersForIndex = useCallback(
    (fieldIndex: number) => {
      const selectedIds = new Set(
        item.suppliers
          .filter((_, i) => i !== fieldIndex)
          .map((s) => s.id)
          .filter((id): id is string => Boolean(id)),
      );

      const selectedNames = new Set(
        item.suppliers
          .filter((_, i) => i !== fieldIndex)
          .map((s) => normalizeOptionName(s.name))
          .filter(Boolean),
      );

      return availableSuppliers.filter((supplier) => {
        if (selectedIds.has(supplier.id)) return false;
        return !selectedNames.has(normalizeOptionName(supplier.name));
      });
    },
    [item.suppliers, availableSuppliers],
  );

  const getAvailableManufacturersForIndex = useCallback(
    (fieldIndex: number) => {
      const selectedNames = new Set(
        item.manufacturers
          .filter((_, i) => i !== fieldIndex)
          .map((name) => normalizeOptionName(name))
          .filter(Boolean),
      );

      return availableManufacturers.filter(
        (manufacturer) =>
          !selectedNames.has(normalizeOptionName(manufacturer.name)),
      );
    },
    [item.manufacturers, availableManufacturers],
  );

  const isComplete =
    filledManufacturers >= MIN_OPTIONS && filledSuppliers >= MIN_OPTIONS;

  return (
    <div
      className={`rounded-2xl border bg-white overflow-visible transition-colors ${
        expanded ? "border-primary-200" : "border-neutral-100"
      }`}
    >
      <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 text-left p-2 -m-2 rounded-xl hover:bg-gray-50 transition-colors"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${
              expanded ? "" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
          {isEditingName ? (
            <input
              autoFocus
              type="text"
              value={item.name}
              onChange={(e) => onRename(e.target.value)}
              onBlur={onFinishEditName}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  onFinishEditName();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="ds-input flex-1 min-w-0"
            />
          ) : (
            <span className="flex-1 truncate text-sm md:text-base font-semibold text-gray-900">
              {item.name}
            </span>
          )}
          <span
            className={`hidden sm:inline-flex items-center gap-1 ds-badge-sm ${
              isComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
            title={
              isComplete
                ? "Material configurado"
                : `Faltam ${Math.max(
                    0,
                    MIN_OPTIONS - filledManufacturers,
                  )} fabricante(s) e ${Math.max(
                    0,
                    MIN_OPTIONS - filledSuppliers,
                  )} fornecedor(es)`
            }
          >
            {isComplete ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Completo
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" strokeWidth={2} />
                Pendente
              </>
            )}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 ds-badge-sm bg-gray-50 text-gray-700 border border-neutral-100">
            <span className="text-gray-500">Qnt:</span>
            <span className="font-semibold">{item.quantity}</span>
          </span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onStartEditName();
            }}
            label="Renomear"
          >
            <Pencil className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            label="Duplicar"
          >
            <Copy className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            label="Remover"
            tone="danger"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 bg-gray-50/60 p-3 md:p-4 flex flex-col gap-4 md:gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="ds-label mb-0">Quantidade</span>
              <span className="ds-caption mt-0.5">
                Total de unidades necessárias
              </span>
            </div>
            <QuantityStepper
              value={item.quantity}
              onIncrement={() => onQuantityDelta(1)}
              onDecrement={() => onQuantityDelta(-1)}
              onChange={onQuantitySet}
            />
          </div>

          <FieldGroup
            title="Fabricantes"
            description={`Informe ao menos ${MIN_OPTIONS} fabricantes`}
            filled={filledManufacturers}
            min={MIN_OPTIONS}
          >
            {item.manufacturers.map((manufacturer, fieldIndex) => (
              <div key={fieldIndex} className="flex items-center gap-2">
                <ManufacturerAutocomplete
                  value={manufacturer}
                  availableManufacturers={getAvailableManufacturersForIndex(
                    fieldIndex,
                  )}
                  onChange={(val) => onManufacturerChange(fieldIndex, val)}
                  placeholder={`Fabricante ${fieldIndex + 1}`}
                />
                <RemoveFieldButton
                  onClick={() => onRemoveManufacturer(fieldIndex)}
                  disabled={item.manufacturers.length <= MIN_OPTIONS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddManufacturer}
              className="ds-btn-inline self-start inline-flex items-center gap-1.5 text-primary-700"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Adicionar fabricante
            </button>
          </FieldGroup>

          <FieldGroup
            title="Fornecedores"
            description={`Informe ao menos ${MIN_OPTIONS} fornecedores`}
            filled={filledSuppliers}
            min={MIN_OPTIONS}
          >
            {item.suppliers.map((supplier, fieldIndex) => (
              <div key={fieldIndex} className="flex items-center gap-2">
                <SupplierAutocomplete
                  value={supplier}
                  placeholder={`Fornecedor ${fieldIndex + 1}`}
                  availableSuppliers={getAvailableSuppliersForIndex(fieldIndex)}
                  onChange={(val) => onSupplierChange(fieldIndex, val)}
                />
                <RemoveFieldButton
                  onClick={() => onRemoveSupplier(fieldIndex)}
                  disabled={item.suppliers.length <= MIN_OPTIONS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddSupplier}
              className="ds-btn-inline self-start inline-flex items-center gap-1.5 text-primary-700"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Adicionar fornecedor
            </button>
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  tone = "default",
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-500 hover:bg-red-50 hover:text-red-600"
      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function FieldGroup({
  title,
  description,
  filled,
  min,
  children,
}: {
  title: string;
  description: string;
  filled: number;
  min: number;
  children: React.ReactNode;
}) {
  const isComplete = filled >= min;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="ds-label mb-0">{title}</span>
          <span className="ds-caption mt-0.5">{description}</span>
        </div>
        <span
          className={`ds-badge-sm ${
            isComplete
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {filled}/{min}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function RemoveFieldButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Remover campo"
      className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onChange,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="w-4 h-4" strokeWidth={2} />
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Quantidade"
        className="w-12 h-9 md:h-10 text-center text-sm font-semibold text-gray-900 bg-transparent border-x border-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      />
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Aumentar quantidade"
        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

interface SupplierAutocompleteProps {
  value: SupplierOption;
  placeholder: string;
  availableSuppliers: OpmeSupplier[];
  onChange: (value: SupplierOption) => void;
}

function SupplierAutocomplete({
  value,
  placeholder,
  availableSuppliers,
  onChange,
}: SupplierAutocompleteProps) {
  return (
    <CatalogAutocomplete
      value={value.name}
      placeholder={placeholder}
      options={availableSuppliers}
      isRegistered={Boolean(value.id)}
      registeredTitle="Fornecedor cadastrado"
      newItemNoun="como novo fornecedor"
      onInputChange={(text) => {
        if (value.id && text !== value.name) onChange({ name: text });
      }}
      onSelect={(supplier) => onChange({ id: supplier.id, name: supplier.name })}
      onCommit={(name) => onChange({ name })}
    />
  );
}

interface ManufacturerAutocompleteProps {
  value: string;
  placeholder: string;
  availableManufacturers: Manufacturer[];
  onChange: (value: string) => void;
}

function ManufacturerAutocomplete({
  value,
  placeholder,
  availableManufacturers,
  onChange,
}: ManufacturerAutocompleteProps) {
  return (
    <CatalogAutocomplete
      value={value}
      placeholder={placeholder}
      options={availableManufacturers}
      registeredTitle="Fabricante cadastrado"
      newItemNoun="como novo fabricante"
      onInputChange={onChange}
      onSelect={(manufacturer) => onChange(manufacturer.name)}
      onCommit={onChange}
    />
  );
}
